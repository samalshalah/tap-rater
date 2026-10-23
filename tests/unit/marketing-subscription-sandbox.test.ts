import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import Stripe from 'stripe';
import {describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/db',()=>({getSupabaseAdmin:()=>({})}));
// Single-process harness: concurrency enforcement is tested separately against Postgres.
vi.mock('@/lib/stripe-processing',()=>({withStripeResourceLock:async(_db:unknown,_key:string,fn:any)=>fn(async()=>{})}));
import {createMarketingCheckout,syncMarketingSubscription} from '@/lib/marketing-subscriptions';
describe.skipIf(process.env.GROWTH_STRIPE_SANDBOX_TEST!=='1')('Growth isolated Stripe sandbox',()=>{
 it('validates standalone and bundled sessions, paid access, cancellation and location allowances',async()=>{
  const url=process.env.LOCAL_MANAGEMENT_TEST_DATABASE_URL!;
  if(!new URL(url).hostname.includes('ep-lively-star-at7d9rqv')||!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('Isolated staging and sandbox credentials required');
  process.env.DATABASE_URL=url;process.env.STRIPE_MODE='test';process.env.MARKETING_CHECKOUT_ENABLED='true';process.env.MARKETING_TEST_ENTITLEMENTS='true';
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),sql=neon(url);
  expect((await stripe.accounts.retrieve('acct_1U1TpVJEgI4VUlPP')).id).toBe('acct_1U1TpVJEgI4VUlPP');
  const email=`growth-${randomUUID()}@example.test`,email2=`growth-${randomUUID()}@example.test`;
  const accounts=await sql`INSERT INTO customers(email,account_status) VALUES(${email},'active'),(${email2},'active') RETURNING id,email`;
  const c=accounts.find(a=>a.email===email)!;
  let subscription:Stripe.Subscription|undefined,product:string|undefined;const sessions:Stripe.Checkout.Session[]=[];
  try{
   const attempt=randomUUID(),params={mode:'payment' as const,success_url:'https://taprater.com/account/packages',cancel_url:'https://taprater.com/growth',metadata:{marketing_only:'true'}};
   const monthly=await createMarketingCheckout(email,{cadence:'month',locations:2,acceptedTerms:true},attempt,params);sessions.push(monthly);
   expect(monthly.amount_total).toBe(5800);expect(monthly.mode).toBe('subscription');expect(monthly.livemode).toBe(false);
   expect((await createMarketingCheckout(email,{cadence:'month',locations:2,acceptedTerms:true},attempt,params)).id).toBe(monthly.id);
   await expect(createMarketingCheckout(email,{cadence:'month',locations:1,acceptedTerms:true},randomUUID(),params)).rejects.toThrow('Another checkout');
   const bundled=await createMarketingCheckout(email2,{cadence:'month',locations:1,acceptedTerms:true},randomUUID(),{...params,metadata:{marketing_only:'false'},line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:4000,product_data:{name:'Sandbox Google stand'}}}]});sessions.push(bundled);
   expect(bundled.amount_total).toBe(6900);
   const bundledItems=await stripe.checkout.sessions.listLineItems(bundled.id);expect(bundledItems.data.find(i=>i.price?.recurring)?.price?.recurring?.interval).toBe('month');expect(bundledItems.data.filter(i=>!i.price?.recurring)).toHaveLength(1);
   expect((await sql`SELECT * FROM customer_marketing_access WHERE customer_id=${c.id}`)).toHaveLength(0);
   product=(await stripe.products.create({name:'Growth sandbox lifecycle QA',metadata:{test_only:'true'}})).id;
   const customer=await stripe.customers.create({email,name:'Growth sandbox QA',payment_method:'pm_card_visa',invoice_settings:{default_payment_method:'pm_card_visa'}});
   subscription=await stripe.subscriptions.create({customer:customer.id,items:[{price_data:{currency:'usd',unit_amount:2900,recurring:{interval:'month'},product},quantity:2}],metadata:{tap_rater:'marketing_growth_v1',account_id:String(c.id),purchase_attempt:attempt}});
   const portal=await stripe.billingPortal.sessions.create({customer:customer.id,configuration:process.env.MARKETING_PORTAL_CONFIGURATION_ID,return_url:'https://taprater.com/account/packages'});
   expect(portal.url).toMatch(/^https:\/\/billing.stripe.com\//);
   const event=()=>({type:'customer.subscription.updated',data:{object:subscription}} as unknown as Stripe.Event);
   await syncMarketingSubscription(event());
   const [access]=await sql`SELECT * FROM customer_marketing_access WHERE customer_id=${c.id}`;
   expect(access).toMatchObject({status:'active',source:'paid',location_limit:2,ai_monthly_limit:310,heatmap_monthly_points:588});
   const locations=await sql`INSERT INTO businesses(customer_id,business_name) VALUES(${c.id},'QA A'),(${c.id},'QA B'),(${c.id},'QA C') RETURNING id`;
   expect((await sql`SELECT claim_marketing_location(${locations[0].id}::uuid,${c.id}::uuid) AS ok`)[0].ok).toBe(true);
   expect((await sql`SELECT claim_marketing_location(${locations[1].id}::uuid,${c.id}::uuid) AS ok`)[0].ok).toBe(true);
   expect((await sql`SELECT claim_marketing_location(${locations[2].id}::uuid,${c.id}::uuid) AS ok`)[0].ok).toBe(false);
   const loc=locations[0].id;
   expect((await sql`SELECT reserve_marketing_units(${loc}::uuid,'ai',300,'review-full') AS ok`)[0].ok).toBe(true);
   expect((await sql`SELECT reserve_marketing_units(${loc}::uuid,'ai',1,'review-extra') AS ok`)[0].ok).toBe(false);
   expect((await sql`SELECT reserve_marketing_units(${loc}::uuid,'ai',10,'profile:full') AS ok`)[0].ok).toBe(true);
   expect((await sql`SELECT reserve_marketing_units(${loc}::uuid,'ai',1,'profile:extra') AS ok`)[0].ok).toBe(false);
   subscription=await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true});await syncMarketingSubscription(event());
   expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${c.id}`)[0].status).toBe('active');
   subscription=await stripe.subscriptions.cancel(subscription.id);await syncMarketingSubscription(event());
   expect((await sql`SELECT status FROM customer_marketing_access WHERE customer_id=${c.id}`)[0].status).toBe('inactive');
   expect((await sql`SELECT marketing_location_allowed(${loc}::uuid) AS ok`)[0].ok).toBe(false);
  }finally{
   if(subscription&&subscription.status!=='canceled')await stripe.subscriptions.cancel(subscription.id);
   if(product)await stripe.products.update(product,{active:false});
   for(const session of sessions)await stripe.checkout.sessions.expire(session.id).catch(()=>{});
   for(const account of accounts){await sql`DELETE FROM businesses WHERE customer_id=${account.id}`;await sql`DELETE FROM customers WHERE id=${account.id}`;}
  }
 },120000);
});
