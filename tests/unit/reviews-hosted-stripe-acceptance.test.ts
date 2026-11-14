import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
import Stripe from 'stripe';
import {it,expect,vi} from 'vitest';
vi.mock('@/lib/marketing-sales',()=>({marketingSalesEnabled:true}));
const mail=vi.hoisted(()=>vi.fn().mockResolvedValue({sent:true}));
vi.mock('@/lib/hosted-setup-email',()=>({sendCustomerActivationEmail:mail}));
import {prepareMarketingBuyer,createMarketingCheckout} from '@/lib/marketing-subscriptions';
import {POST as webhook} from '@/app/api/webhooks/stripe/route';
import {activateCustomerAccountWithClient} from '@/lib/customer-account';
import {createNeonSupabaseAdapterFromUrl} from '@/lib/neon-supabase-adapter';

it.skipIf(process.env.REVIEWS_HOSTED_STRIPE_TEST!=='1')('real hosted Stripe payment, signed webhook, activation and portal cancellation on isolated QA',async()=>{
 const url=process.env.REVIEWS_JOURNEY_DATABASE_URL!;
 if(new URL(url).hostname!=='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech'||!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('Dedicated QA database and sandbox key required');
 Object.assign(process.env,{DATABASE_URL:url,NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',STRIPE_MODE:'test',MARKETING_CHECKOUT_ENABLED:'true',MARKETING_TEST_ENTITLEMENTS:'true',MARKETING_PORTAL_CONFIGURATION_ID:'default',STRIPE_WEBHOOK_SECRET:readFileSync('.local-sandbox/reviews-webhook-secret','utf8').trim()});
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),sql=neon(url);
 expect((await stripe.accounts.retrieve(null)).id).toBe('acct_1U1TpVJEgI4VUlPP');
 const uid=randomUUID(),email=`reviews-hosted-${uid}@example.test`,attempt=randomUUID();
 let customerId='',session:Stripe.Checkout.Session|undefined,subscriptionId='',queue=Promise.resolve();
 const events:{id:string;type:string;status:number}[]=[];
 const evidence:any={sandbox:'acct_1U1TpVJEgI4VUlPP',stage:'starting',emailDelivery:'simulated'};
 mkdirSync('.local-sandbox',{recursive:true});
 const save=()=>writeFileSync('.local-sandbox/reviews-hosted.json',JSON.stringify({...evidence,events},null,2));
 const wait=async(check:()=>Promise<boolean>,label:string)=>{const end=Date.now()+600000;while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,1000));}throw Error('Timed out: '+label);};
 const server=createServer(async(req,res)=>{
  if(req.url!=='/webhook'){res.setHeader('Content-Type','text/html');res.end('<h1>Tap Rater isolated Stripe QA</h1><p>Payment returned. Checking the signed Stripe webhook.</p><p>No live payment was taken.</p>');return;}
  let raw='';for await(const chunk of req)raw+=chunk;
  // Ignore other sandbox work; only this test customer's metadata reaches the real handler.
  const event=JSON.parse(raw);const object=event.data?.object;
  const account=object?.metadata?.marketing_account||object?.metadata?.account_id||object?.parent?.subscription_details?.metadata?.account_id;
  if(account!==customerId){res.end('Ignored unrelated sandbox event');return;}
  queue=queue.then(async()=>{const result=await webhook(new Request('http://127.0.0.1:4183/api/webhooks/stripe',{method:'POST',headers:{'stripe-signature':String(req.headers['stripe-signature']||'')},body:raw}));events.push({id:event.id,type:event.type,status:result.status});save();res.statusCode=result.status;res.end(await result.text());}).catch(()=>{res.statusCode=500;res.end('QA processing error');});
 });
 await new Promise<void>(resolve=>server.listen(4183,'127.0.0.1',resolve));
 try{
  await prepareMarketingBuyer(email,'Reviews hosted QA');
  [{id:customerId}]=await sql`SELECT id FROM customers WHERE email=${email}`;
  session=await createMarketingCheckout(email,{cadence:'month',locations:1,acceptedTerms:true},attempt,{mode:'payment',ui_mode:'hosted_page',success_url:'http://127.0.0.1:4183/success',cancel_url:'http://127.0.0.1:4183/cancel',metadata:{marketing_only:'true'},billing_address_collection:'required'});
  expect(session.livemode).toBe(false);expect(session.amount_total).toBe(2900);
  const invalid=await webhook(new Request('http://127.0.0.1:4183/api/webhooks/stripe',{method:'POST',headers:{'stripe-signature':'invalid'},body:'{}'}));expect(invalid.status).toBe(400);
  Object.assign(evidence,{stage:'awaiting_hosted_payment',checkoutUrl:session.url,sessionId:session.id});save();
  await wait(async()=>{const [row]=await sql`SELECT status,stripe_subscription_id FROM marketing_subscriptions WHERE customer_id=${customerId}`;if(row?.status==='active'){subscriptionId=row.stripe_subscription_id;return true;}return false;},'hosted payment webhook');
  await wait(async()=>events.some(e=>e.type==='checkout.session.completed'&&e.status===200),'checkout completion delivery');
  const paid=await stripe.checkout.sessions.retrieve(session.id);expect(paid.payment_status).toBe('paid');expect(paid.livemode).toBe(false);
  expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${customerId}`)[0].status).toBe('active');
  expect(mail).toHaveBeenCalledTimes(1);
  expect(await activateCustomerAccountWithClient(createNeonSupabaseAdapterFromUrl(url),mail.mock.calls[0][0].activationToken,randomUUID())).toMatchObject({ok:true,email});
  const portal=await stripe.billingPortal.sessions.create({customer:String(paid.customer),return_url:'http://127.0.0.1:4183/returned'});
  Object.assign(evidence,{stage:'awaiting_portal_cancellation',paymentStatus:paid.payment_status,activationPassed:true,portalUrl:portal.url,subscriptionId});save();
  await wait(async()=>Boolean((await sql`SELECT cancel_at_period_end FROM marketing_subscriptions WHERE customer_id=${customerId}`)[0]?.cancel_at_period_end),'portal cancellation webhook');
  expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${customerId}`)[0].status).toBe('active');
  await stripe.subscriptions.cancel(subscriptionId);
  await wait(async()=>(await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${customerId}`)[0]?.status==='inactive','final cancellation webhook');
  expect(events.every(e=>e.status===200)).toBe(true);
  Object.assign(evidence,{stage:'passed',portalCancellationPassed:true,finalCancellationRevokedAccess:true});save();
 }finally{
  if(subscriptionId){const s=await stripe.subscriptions.retrieve(subscriptionId);if(s.status!=='canceled')await stripe.subscriptions.cancel(subscriptionId);}
  if(session){const s=await stripe.checkout.sessions.retrieve(session.id);if(s.status==='open')await stripe.checkout.sessions.expire(s.id);}
  await queue;server.close();
  // QA records remain for acceptance evidence; production is never touched.
 }
},1300000);
