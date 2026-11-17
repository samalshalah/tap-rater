import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {expect,it,vi,afterEach} from 'vitest';
import type Stripe from 'stripe';
const mocks=vi.hoisted(()=>({jar:new Map<string,string>(),client:vi.fn(),stripeCreate:vi.fn(),stripeRetrieve:vi.fn(),mail:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(key:string)=>mocks.jar.has(key)?{value:mocks.jar.get(key)}:undefined,set:(key:string,value:string)=>mocks.jar.set(key,value)})}));
vi.mock('@/lib/google-business/live-reviews',async original=>({...await original<object>(),clientFor:mocks.client}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'test',getStripeClient:()=>({checkout:{sessions:{create:mocks.stripeCreate}},subscriptions:{retrieve:mocks.stripeRetrieve}})}));
vi.mock('@/lib/hosted-setup-email',()=>({sendCustomerActivationEmail:mocks.mail}));
import {startReviewPreview,currentReviewPreview,selectReviewPreview,continueReviewPreview,reserveReviewPreview,previewOwner} from '@/lib/reviews-purchase-preview';
import {paidReviewPreview,resumePaidReviewPreview} from '@/lib/reviews-preview-setup';
import {prepareMarketingBuyer,createMarketingCheckout,syncMarketingSubscription} from '@/lib/marketing-subscriptions';
import {encryptGoogleSecret,decryptGoogleSecret} from '@/lib/google-business/token-vault';
const url=process.env.REVIEWS_JOURNEY_DATABASE_URL;
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.skipIf(!url)('read-only preview → two review pages → checkout → verified payment → same business and connection in setup, isolated SQL',async()=>{
 if(new URL(url!).hostname!=='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech')throw Error('Dedicated QA branch required.');
 const originalFetch=globalThis.fetch;
 vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const target=new URL(input instanceof Request?input.url:String(input));
  const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
  if(target.hostname!=='api.c-9.us-east-1.aws.neon.tech'||target.pathname!=='/sql'||headers.get('Neon-Connection-String')!==url)throw Error('External network blocked in preview QA');
  return originalFetch(input,init);
 });
 for(const [key,value] of Object.entries({DATABASE_URL:url!,GOOGLE_BUSINESS_TOKEN_KEY:'a'.repeat(64),NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',MARKETING_CHECKOUT_ENABLED:'true',MARKETING_PORTAL_CONFIGURATION_ID:'default',MARKETING_TEST_ENTITLEMENTS:'true'}))vi.stubEnv(key,value);
 const sql=neon(url!),uid=randomUUID(),email=`preview-${uid}@example.test`,attempt=randomUUID(),location=`locations/qa_${uid.replaceAll('-','')}`,account='accounts/qa_preview',parent=account+'/'+location;
 const reviews=vi.fn().mockResolvedValueOnce({reviews:[{reviewId:'one',starRating:'ONE'},{reviewId:'two',starRating:'FIVE',reviewReply:{comment:'Thanks'}}],totalReviewCount:3,nextPageToken:'page2'}).mockResolvedValueOnce({reviews:[{reviewId:'three',starRating:'TWO'}],totalReviewCount:3}).mockResolvedValue({reviews:[],totalReviewCount:3});
 const factory={getMapAnchor:async()=>({placeId:'qa-place',title:'Preview QA'}),getProfile:async()=>({name:'Preview QA',address:'QA address'}),listReviews:reviews,listLocations:async()=>({locations:[{name:location,title:'Preview QA',storefrontAddress:{addressLines:['QA address']}}]})};
 mocks.client.mockResolvedValue(factory);mocks.mail.mockResolvedValue({sent:true});mocks.stripeCreate.mockResolvedValue({id:'cs_qa_'+uid,url:'https://checkout.stripe.com/fixture'});
 let customerId='',previewId='',businessId='';
 try{
  await startReviewPreview({placeId:'qa-place',name:'Public search name',formattedAddress:'Search address'});
  const session=await currentReviewPreview();previewId=session!.id;const owner=previewOwner(previewId),subject='qa_subject';
  await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${subject},'qa-google@example.test',${encryptGoogleSecret('fixture-access',`access:${owner}:${subject}`)},${encryptGoogleSecret('fixture-refresh',`refresh:${owner}:${subject}`)},now()+interval '1 hour','https://www.googleapis.com/auth/business.manage')`;
  expect(await sql`SELECT id FROM customers WHERE email=${email}`).toHaveLength(0);
  expect((await selectReviewPreview(account,location)).preview).toMatchObject({complete:false,analysis:{reviewCount:2,unanswered:1}});
  expect((await continueReviewPreview()).preview).toMatchObject({complete:true,name:'Preview QA',analysis:{reviewCount:3,unanswered:2}});
  expect(reviews).toHaveBeenNthCalledWith(2,parent,'page2');
  expect(await sql`SELECT * FROM google_review_links WHERE parent=${parent}`).toHaveLength(0);
  expect(await paidReviewPreview(email)).toBeNull();
  await prepareMarketingBuyer(email,'Preview QA');[{id:customerId}]=await sql`SELECT id FROM customers WHERE email=${email}`;
  await reserveReviewPreview(email,attempt,'test');
  await expect(selectReviewPreview(account,location)).rejects.toThrow('new preview');
  await createMarketingCheckout(email,{cadence:'month',locations:1,acceptedTerms:true},attempt,{mode:'payment',metadata:{marketing_only:'true',reviews_preview_id:previewId}});
  const stripeParams=mocks.stripeCreate.mock.calls[0][0];expect(stripeParams.subscription_data.metadata.reviews_preview_id).toBe(previewId);
  const sub:any={id:'sub_qa_'+uid,livemode:false,status:'active',customer:'cus_qa_'+uid,metadata:stripeParams.subscription_data.metadata,items:{data:[{quantity:1,current_period_end:Math.floor(Date.now()/1000)+86400*30,price:{currency:'usd',unit_amount:2900,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{status:'open'}};
  mocks.stripeRetrieve.mockImplementation(async()=>sub);
  await syncMarketingSubscription({type:'customer.subscription.updated',data:{object:sub}} as Stripe.Event);
  expect((await sql`SELECT paid_at FROM reviews_purchase_previews WHERE id=${previewId}`)[0].paid_at).toBeNull();
  sub.latest_invoice.status='paid';await syncMarketingSubscription({type:'invoice.paid',data:{object:{subscription:sub.id,parent:{subscription_details:{metadata:sub.metadata}}}}} as unknown as Stripe.Event);
  expect((await sql`SELECT paid_at FROM reviews_purchase_previews WHERE id=${previewId}`)[0].paid_at).toBeTruthy();
  expect(await paidReviewPreview(email)).toBeNull(); // Account activation is still required.
  await sql`UPDATE customers SET account_status='active' WHERE id=${customerId}`;
  expect(await paidReviewPreview(email)).toMatchObject({id:previewId,name:'Preview QA'});
  await expect(resumePaidReviewPreview('other@example.test')).rejects.toThrow('unavailable');
  await resumePaidReviewPreview(email);[{business_id:businessId}]=await sql`SELECT business_id FROM reviews_purchase_previews WHERE id=${previewId}`;
  const [linked]=await sql`SELECT owner,parent,ai_consent,auto_enabled,customer_id FROM google_review_links WHERE business_id=${businessId}`;
  expect(linked).toMatchObject({parent,customer_id:customerId,ai_consent:false,auto_enabled:false});expect(linked.owner).toBe(`customer:${email}:location:${businessId}`);
  const [connection]=await sql`SELECT * FROM google_business_connections WHERE owner=${linked.owner}`;
  expect(decryptGoogleSecret(connection.refresh_ciphertext,`refresh:${linked.owner}:${subject}`)).toBe('fixture-refresh');
  expect(await sql`SELECT owner FROM google_business_connections WHERE owner=${owner}`).toHaveLength(0);
  await resumePaidReviewPreview(email);expect(await sql`SELECT id FROM businesses WHERE customer_id=${customerId}`).toHaveLength(1);
  expect(await sql`SELECT customer_id FROM reviews_draft_only_customers WHERE customer_id=${customerId}`).toHaveLength(1);
 }finally{
  if(previewId)await sql`DELETE FROM reviews_purchase_previews WHERE id=${previewId}`;
  if(customerId){await sql`DELETE FROM google_review_links WHERE customer_id=${customerId}`;await sql`DELETE FROM google_business_connections WHERE owner LIKE ${'customer:'+email+':location:%'}`;await sql`UPDATE customers SET marketing_onboarding_business_id=NULL WHERE id=${customerId}`;await sql`DELETE FROM businesses WHERE customer_id=${customerId}`;await sql`DELETE FROM marketing_subscriptions WHERE customer_id=${customerId}`;await sql`DELETE FROM customer_marketing_access WHERE customer_id=${customerId}`;await sql`DELETE FROM customers WHERE id=${customerId}`;}
  if(previewId)await sql`DELETE FROM google_business_connections WHERE owner=${previewOwner(previewId)}`;
 }
},90000);
