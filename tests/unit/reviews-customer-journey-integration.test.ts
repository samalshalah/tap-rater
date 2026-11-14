import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {describe,it,expect,vi,afterEach} from 'vitest';
import type Stripe from 'stripe';
// These substitutions are confined to this test module. Production stays paused.
vi.mock('@/lib/marketing-sales',()=>({marketingSalesEnabled:true}));
const external=vi.hoisted(()=>({session:vi.fn(),retrieveSession:vi.fn(),subscription:vi.fn(),email:vi.fn()}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'test',getStripeClient:()=>({checkout:{sessions:{create:external.session,retrieve:external.retrieveSession}},subscriptions:{retrieve:external.subscription}})}));
vi.mock('@/lib/hosted-setup-email',()=>({sendCustomerActivationEmail:external.email}));
import {prepareMarketingBuyer,createMarketingCheckout,syncMarketingSubscription} from '@/lib/marketing-subscriptions';
import {activateCustomerAccountWithClient,verifyCustomerPassword} from '@/lib/customer-account';
import {createNeonSupabaseAdapterFromUrl} from '@/lib/neon-supabase-adapter';
import {bindGoogleLocation,syncLiveReviews,listLiveWorkspaces,saveLiveDraft,approveLiveDraft,publishLiveReply,reconcileLiveReply,saveLiveSettings,prepareAutomaticDraft} from '@/lib/google-business/live-reviews';
import {customerLocationConnection} from '@/lib/google-business/customer-location-connection';

const url=process.env.REVIEWS_JOURNEY_DATABASE_URL;
afterEach(()=>vi.unstubAllEnvs());
describe.skipIf(!url)('Google Reviews journey on the dedicated QA database (external services simulated)',()=>{
 it('purchases, activates, imports, edits, confirms posting, reconciles, enforces limits and revokes canceled access',async()=>{
  // Deliberately exact: this can never run against either production endpoint.
  if(new URL(url!).hostname!=='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech')throw Error('Dedicated Reviews launch QA branch required');
  vi.stubEnv('DATABASE_URL',url!);vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');
  vi.stubEnv('MARKETING_CHECKOUT_ENABLED','true');vi.stubEnv('MARKETING_PORTAL_CONFIGURATION_ID','default');vi.stubEnv('MARKETING_TEST_ENTITLEMENTS','true');vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');
  const sql=neon(url!),uid=randomUUID(),email=`reviews-journey-${uid}@example.test`,actor={kind:'customer' as const,email};
  let customerId='',businessId='',owner='';
  const attempt=randomUUID(),subscriptionId='sub_qa_'+uid,sessionId='cs_test_'+uid;
  external.email.mockResolvedValue({sent:true});external.session.mockResolvedValue({id:sessionId,url:'https://checkout.stripe.com/test-only',status:'open'});external.retrieveSession.mockResolvedValue({id:sessionId,status:'open'});
  try{
   await prepareMarketingBuyer(email,'Synthetic Reviews Buyer');
   [{id:customerId}]=await sql`SELECT id FROM customers WHERE email=${email}`;
   const params={mode:'payment' as const,metadata:{marketing_only:'true'}};
   await createMarketingCheckout(email,{cadence:'month',locations:1,acceptedTerms:true},attempt,params);
   expect(external.session.mock.calls[0][0]).toMatchObject({mode:'subscription',line_items:[{quantity:1,price_data:{unit_amount:2900,recurring:{interval:'month'},product_data:{name:'Tap Rater Google Reviews'}}}]});
   await createMarketingCheckout(email,{cadence:'month',locations:1,acceptedTerms:true},attempt,params);expect(external.session).toHaveBeenCalledTimes(1);
   expect(await sql`SELECT * FROM customer_marketing_access WHERE customer_id=${customerId}`).toHaveLength(0);expect(external.email).not.toHaveBeenCalled();
   let subscription:any={id:subscriptionId,livemode:false,status:'incomplete',customer:'cus_qa_'+uid,metadata:{tap_rater:'marketing_growth_v1',account_id:customerId,purchase_attempt:attempt},items:{data:[{quantity:1,current_period_end:Math.floor(Date.now()/1000)+86400*30,price:{currency:'usd',unit_amount:2900,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{status:'open'},cancel_at_period_end:false};
   external.subscription.mockImplementation(async()=>subscription);
   const event=(type='customer.subscription.updated')=>({type,data:{object:subscription}} as Stripe.Event);
   await syncMarketingSubscription(event());expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${customerId}`)[0].status).toBe('inactive');expect(external.email).not.toHaveBeenCalled();
   subscription={...subscription,status:'active',latest_invoice:{status:'paid'}};
   await syncMarketingSubscription(event());await syncMarketingSubscription(event());expect(external.email).toHaveBeenCalledTimes(1);
   const password='Test-only-'+randomUUID();const token=external.email.mock.calls[0][0].activationToken;
   expect(await activateCustomerAccountWithClient(createNeonSupabaseAdapterFromUrl(url!),token,password)).toMatchObject({ok:true,email});
   expect((await activateCustomerAccountWithClient(createNeonSupabaseAdapterFromUrl(url!),token,password)).ok).toBe(false);
   const [account]=await sql`SELECT password_hash FROM customers WHERE id=${customerId}`;expect(verifyCustomerPassword(password,account.password_hash)).toBe(true);
   await expect(prepareMarketingBuyer(email,'Guest takeover')).rejects.toThrow('Sign in');
   await expect(createMarketingCheckout(email,{cadence:'month',locations:1,acceptedTerms:true},randomUUID(),params)).rejects.toThrow('already have');
   [{id:businessId}]=await sql`SELECT create_marketing_business(${customerId}::uuid,'Synthetic Reviews Journey','QA only') AS id`;
   owner=`customer:${email}:location:${businessId}`;
   await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${uid},${email},'test-only','test-only',now()+interval '1 hour','test-only')`;
   const parent='accounts/qa/locations/'+uid,location='locations/'+uid;
   const positive={reviewId:'positive',starRating:'FIVE',comment:'Synthetic positive review',createTime:new Date(Date.now()+1000).toISOString(),updateTime:new Date().toISOString()};
   const negative={reviewId:'negative',starRating:'ONE',comment:'Synthetic long wait',createTime:new Date(Date.now()+1000).toISOString(),updateTime:new Date().toISOString()};
   const google={listLocations:vi.fn().mockResolvedValue({locations:[{name:location,title:'Synthetic Reviews Journey'}]}),listReviews:vi.fn().mockResolvedValue({reviews:[],totalReviewCount:2}),getReview:vi.fn(),publishReply:vi.fn()};
   const factory=vi.fn().mockResolvedValue(google);
   await bindGoogleLocation(owner,businessId,'accounts/qa',location,sql,factory,email);
   let [link]=await sql`SELECT * FROM google_review_links WHERE business_id=${businessId}`;expect(link).toMatchObject({ai_consent:false,auto_enabled:false,draft_low_stars:false});
   expect(await prepareAutomaticDraft(businessId,sql,vi.fn())).toEqual({drafted:false});
   google.listReviews.mockResolvedValueOnce({reviews:[positive],totalReviewCount:2,nextPageToken:'page2'}).mockResolvedValueOnce({reviews:[negative],totalReviewCount:2});
   expect(await syncLiveReviews(actor,businessId,sql,factory)).toEqual({imported:1,more:true});
   await sql`UPDATE google_review_links SET checked_at=now()-interval '11 seconds' WHERE business_id=${businessId}`;
   expect(await syncLiveReviews(actor,businessId,sql,factory)).toEqual({imported:1,more:false});
   expect((await listLiveWorkspaces(actor,sql,[businessId]))[0]).toMatchObject({saved_count:2,initial_import_completed:true,ai_monthly_limit:1000});
   const stranger={kind:'customer' as const,email:'other-customer@example.test'};
   expect(await listLiveWorkspaces(stranger,sql,[businessId])).toEqual([]);
   let [review]=await sql`SELECT * FROM google_live_reviews WHERE business_id=${businessId} AND resource=${parent+'/reviews/negative'}`;
   await expect(saveLiveDraft(stranger,review.id,'Unauthorized',review.version,sql)).rejects.toMatchObject({status:404});
   const saved=await saveLiveDraft(actor,review.id,'Thank you for explaining the wait.',review.version,sql);
   await expect(saveLiveDraft(actor,review.id,'Stale overwrite',review.version,sql)).rejects.toThrow('changed');
   await approveLiveDraft(actor,review.id,Number(saved.version),sql);expect(google.publishReply).not.toHaveBeenCalled();
   google.getReview.mockResolvedValue(negative);google.publishReply.mockRejectedValueOnce(Error('timeout after Google received reply'));
   await expect(publishLiveReply(actor,review.id,Number(saved.version),false,sql,factory)).rejects.toThrow('not confirmed');
   await sql`UPDATE google_live_reviews SET attempted_at=now()-interval '2 minutes' WHERE id=${review.id}`;
   google.getReview.mockResolvedValue({...negative,reviewReply:{comment:'Thank you for explaining the wait.'}});
   expect(await reconcileLiveReply(actor,review.id,sql,factory)).toMatchObject({published:true});expect(google.publishReply).toHaveBeenCalledTimes(1);
   const settings={businessId,aiConsent:true,autoEnabled:true,four:true,five:true,lowStars:true,style:'friendly' as const,version:Number(link.settings_version),confirmAutomaticPosting:false};
   await expect(saveLiveSettings(actor,settings,sql)).rejects.toThrow('expressly confirmed');
   await saveLiveSettings(actor,{...settings,confirmAutomaticPosting:true},sql);
   [link]=await sql`SELECT * FROM google_review_links WHERE business_id=${businessId}`;
   await saveLiveSettings(actor,{...settings,version:Number(link.settings_version),autoEnabled:false,confirmAutomaticPosting:false},sql);
   expect((await sql`SELECT auto_enabled FROM google_review_links WHERE business_id=${businessId}`)[0].auto_enabled).toBe(false);
   await sql`UPDATE marketing_location_access SET ai_monthly_limit_override=1200 WHERE business_id=${businessId}`;
   expect((await sql`SELECT reserve_marketing_units(${businessId}::uuid,'ai',1200,${uid}) AS ok`)[0].ok).toBe(true);
   expect((await sql`SELECT reserve_marketing_units(${businessId}::uuid,'ai',1,${uid+'extra'}) AS ok`)[0].ok).toBe(false);
   expect((await listLiveWorkspaces(actor,sql,[businessId]))[0]).toMatchObject({ai_monthly_limit:1200,ai_monthly_used:'1200'});
   await sql`UPDATE google_review_links SET owner='admin:qa-shared-manager' WHERE business_id=${businessId}`;
   expect(await customerLocationConnection({owner:'customer:'+email,email},businessId,sql)).toMatchObject({canDiscover:true}); // Own scoped token wins.
   await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   expect(await customerLocationConnection({owner:'customer:'+email,email},businessId,sql)).toMatchObject({canDiscover:false});
   subscription={...subscription,cancel_at_period_end:true};await syncMarketingSubscription(event());expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${customerId}`)[0].status).toBe('active');
   subscription={...subscription,status:'past_due',latest_invoice:{status:'open'}};await syncMarketingSubscription(event());expect((await sql`SELECT marketing_location_allowed(${businessId}::uuid) AS allowed`)[0].allowed).toBe(false);
   subscription={...subscription,status:'active',latest_invoice:{status:'paid'}};await syncMarketingSubscription(event());expect((await sql`SELECT marketing_location_allowed(${businessId}::uuid) AS allowed`)[0].allowed).toBe(true);
   subscription={...subscription,status:'canceled'};await syncMarketingSubscription(event());expect((await sql`SELECT marketing_location_allowed(${businessId}::uuid) AS allowed`)[0].allowed).toBe(false);
  }finally{
   // Only synthetic rows created by this test in the exact allowlisted QA branch.
   if(businessId)await sql`DELETE FROM businesses WHERE id=${businessId}`;
   if(owner)await sql`DELETE FROM google_business_connections WHERE owner=${owner}`;
   if(customerId){await sql`DELETE FROM stripe_processing_locks WHERE resource_key=${'marketing:test:'+customerId}`;await sql`DELETE FROM customers WHERE id=${customerId}`;}
  }
 },120000);
});
