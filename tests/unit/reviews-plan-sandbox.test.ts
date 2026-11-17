import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import Stripe from 'stripe';
import {it,expect,vi} from 'vitest';
vi.mock('@/lib/db',()=>({getSupabaseAdmin:()=>({})}));
vi.mock('@/lib/stripe-processing',()=>({withStripeResourceLock:async(_db:unknown,_key:string,fn:any)=>fn(async()=>{})}));
vi.mock('@/lib/hosted-setup-email',()=>({sendCustomerActivationEmail:vi.fn(()=>{throw Error('No email allowed in this test');})}));
import {previewReviewsPlan,confirmReviewsPlan,reviewsBillingSnapshot} from '@/lib/reviews-plan-management';
import {syncMarketingSubscription} from '@/lib/marketing-subscriptions';

it.skipIf(process.env.REVIEWS_PLAN_SANDBOX_TEST!=='1')('schedules, undoes and applies real sandbox billing changes without early access changes',async()=>{
 const url=process.env.REVIEWS_JOURNEY_DATABASE_URL!;
 if(new URL(url).hostname!=='ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech'||!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('Isolated QA database and Stripe sandbox required');
 process.env.DATABASE_URL=url;process.env.STRIPE_MODE='test';process.env.MARKETING_TEST_ENTITLEMENTS='true';
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),sql=neon(url);
 expect((await stripe.accounts.retrieve(null)).id).toBe('acct_1U1TpVJEgI4VUlPP');
 const account=randomUUID(),attempt=randomUUID(),email=`plan-${account}@example.test`;
 let clock='',product='',customer='',sub:Stripe.Subscription|undefined;
 const sync=async()=>{sub=await stripe.subscriptions.retrieve(sub!.id);await syncMarketingSubscription({type:'customer.subscription.updated',data:{object:sub}} as Stripe.Event);};
 const change=async(kind:'locations'|'cancel'|'keep',removedIds:string[]=[])=>{const choice={kind,removedIds},p=await previewReviewsPlan(email,choice);const request={choice,token:p.token,operationId:randomUUID()};await confirmReviewsPlan(email,request);await confirmReviewsPlan(email,request);return p;};
 try{
  await sql`INSERT INTO customers(id,email,account_status) VALUES(${account}::uuid,${email},'active')`;
  await sql`INSERT INTO reviews_period_licences(customer_id) VALUES(${account}::uuid)`;
  await sql`INSERT INTO marketing_subscriptions(customer_id,stripe_mode,attempt,cadence,locations,checkout_expires_at) VALUES(${account}::uuid,'test',${attempt}::uuid,'month',3,now()+interval '1 hour')`;
  clock=(await stripe.testHelpers.testClocks.create({frozen_time:Math.floor(Date.now()/1000),name:'Reviews plan isolated QA'})).id;
  product=(await stripe.products.create({name:'Reviews plan isolated QA',metadata:{test_only:'true'}})).id;
  customer=(await stripe.customers.create({email,test_clock:clock,payment_method:'pm_card_visa',invoice_settings:{default_payment_method:'pm_card_visa'}})).id;
  sub=await stripe.subscriptions.create({customer,items:[{price_data:{currency:'usd',unit_amount:2900,recurring:{interval:'month'},product},quantity:3}],metadata:{tap_rater:'marketing_growth_v1',account_id:account,purchase_attempt:attempt}});
  await sync();
  await change('cancel');expect((await reviewsBillingSnapshot(email)).cancelling).toBe(true);
  await change('keep');expect((await reviewsBillingSnapshot(email)).cancelling).toBe(false);
  const unusedChoice={kind:'locations' as const,removedIds:[],unusedToRemove:1};
  const unusedPreview=await previewReviewsPlan(email,unusedChoice);
  const unusedRequest={choice:unusedChoice,token:unusedPreview.token,operationId:randomUUID()};
  await confirmReviewsPlan(email,unusedRequest);
  expect((await reviewsBillingSnapshot(email)).nextQuantity).toBe(2);
  const locations:string[]=[];for(const name of ['First QA','Second QA','Third QA']){
   if(name==='Third QA'){
    await expect(sql`SELECT create_marketing_business(${account}::uuid,'Blocked QA','Test address')`).rejects.toThrow('scheduled for removal');
    await change('locations',[]);
    await confirmReviewsPlan(email,unusedRequest);expect((await reviewsBillingSnapshot(email)).nextQuantity).toBe(3);
   }
   const [r]=await sql`SELECT create_marketing_business(${account}::uuid,${name},'Test address') AS id`;locations.push(String(r.id));
  }
  const before=await sql`SELECT business_id,enabled FROM marketing_location_access WHERE customer_id=${account}::uuid ORDER BY business_id`;
  await expect(previewReviewsPlan('foreign@example.test',{kind:'cancel',removedIds:[]})).rejects.toThrow();
  const stale=await previewReviewsPlan(email,{kind:'locations',removedIds:[locations[1]]});
  const p=await change('locations',[locations[0]]);expect(p.nextSubtotal).toBe(5800);
  expect((await stripe.subscriptions.retrieve(sub.id)).items.data[0].quantity).toBe(3);
  expect(await sql`SELECT business_id,enabled FROM marketing_location_access WHERE customer_id=${account}::uuid ORDER BY business_id`).toEqual(before);
  await expect(confirmReviewsPlan(email,{choice:{kind:'locations',removedIds:[locations[1]]},token:stale.token,operationId:randomUUID()})).rejects.toThrow('changed');
  expect((await reviewsBillingSnapshot(email)).nextQuantity).toBe(2);
  await change('locations',[]);expect((await reviewsBillingSnapshot(email)).nextQuantity).toBe(3);
  await change('cancel');expect((await reviewsBillingSnapshot(email)).cancelling).toBe(true);
  await sync();expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${account}::uuid`)[0].status).toBe('active');
  await change('keep');expect((await reviewsBillingSnapshot(email)).cancelling).toBe(false);
  await change('locations',[locations[0]]);
  const renewal=sub.items.data[0].current_period_end;
  await stripe.testHelpers.testClocks.advance(clock,{frozen_time:renewal+60});
  for(let n=0;n<50;n++){if((await stripe.testHelpers.testClocks.retrieve(clock)).status==='ready')break;await new Promise(r=>setTimeout(r,1000));}
  sub=await stripe.subscriptions.retrieve(sub.id,{expand:['latest_invoice']});
  expect(sub.items.data[0].quantity).toBe(2);
  const invoice=sub.latest_invoice as Stripe.Invoice;expect(invoice.subtotal).toBe(5800);
  // Test clocks create renewal invoices as draft; pay this sandbox invoice to simulate the paid event.
  if(invoice.status==='draft')await stripe.invoices.finalizeInvoice(invoice.id);
  const current=await stripe.invoices.retrieve(invoice.id);if(current.status==='open')await stripe.invoices.pay(invoice.id);
  await sync();await sync();
  const access=await sql`SELECT business_id,enabled FROM marketing_location_access WHERE customer_id=${account}::uuid`;
  expect(access.find(r=>r.business_id===locations[0])?.enabled).toBe(false);
  expect(access.filter(r=>r.enabled).map(r=>r.business_id).sort()).toEqual(locations.slice(1).sort());
  expect((await sql`SELECT count(*)::int AS n FROM reviews_period_assignments WHERE customer_id=${account}::uuid AND period_start=to_timestamp(${renewal})`)[0].n).toBe(2);
  await expect(previewReviewsPlan(email,{kind:'locations',removedIds:locations.slice(1)})).rejects.toThrow('last paid location');
  await change('cancel');await sync();expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${account}::uuid`)[0].status).toBe('active');
  await stripe.testHelpers.testClocks.advance(clock,{frozen_time:sub!.items.data[0].current_period_end+60});
  for(let n=0;n<50;n++){if((await stripe.testHelpers.testClocks.retrieve(clock)).status==='ready')break;await new Promise(r=>setTimeout(r,1000));}
  await sync();expect(sub!.status).toBe('canceled');
  expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${account}::uuid`)[0].status).toBe('inactive');
  console.info('Sandbox passed: deferred quantity, undo, cancellation undo, stale protection, $58 renewal and selected-location removal.');
 }finally{
  if(clock)await stripe.testHelpers.testClocks.del(clock);
  if(product)await stripe.products.update(product,{active:false});
  await sql`DELETE FROM reviews_billing_requests WHERE customer_id=${account}::uuid`;
  await sql`DELETE FROM reviews_billing_completed WHERE customer_id=${account}::uuid`;
  await sql`DELETE FROM reviews_applied_plan_changes WHERE customer_id=${account}::uuid`;
  await sql`DELETE FROM businesses WHERE customer_id=${account}::uuid`;
  await sql`DELETE FROM customers WHERE id=${account}::uuid`;
 }
},180000);
