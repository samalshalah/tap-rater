import {describe,it,expect,vi,beforeEach} from 'vitest';
import type Stripe from 'stripe';
// Keep legacy subscription lifecycle coverage independent of the sales pause.
vi.mock('@/lib/marketing-sales',()=>({marketingSalesEnabled:true}));
const mocks=vi.hoisted(()=>({sql:vi.fn(),retrieve:vi.fn(),create:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'test',getStripeClient:()=>({subscriptions:{retrieve:mocks.retrieve},checkout:{sessions:{create:mocks.create,retrieve:mocks.retrieve}}})}));
vi.mock('@/lib/db',()=>({getSupabaseAdmin:()=>({})}));
vi.mock('@/lib/stripe-processing',()=>({withStripeResourceLock:async(_db:unknown,_key:string,fn:any)=>fn(async()=>{})}));
import {marketingPurchaseSchema,marketingAmount,addMarketingToCheckout} from '@/lib/marketing-plan';
import {marketingSubscriptionState,subscriptionEventId,syncMarketingSubscription,createMarketingCheckout} from '@/lib/marketing-subscriptions';
const sub=(overrides:Record<string,unknown>={})=>({id:'sub_growth',livemode:false,status:'active',customer:'cus_test',metadata:{tap_rater:'marketing_growth_v1',account_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',purchase_attempt:'attempt'},items:{data:[{quantity:2,current_period_end:1900000000,price:{currency:'usd',unit_amount:2900,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{status:'paid'},cancel_at_period_end:false,...overrides}) as unknown as Stripe.Subscription;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('MARKETING_CHECKOUT_ENABLED','true');vi.stubEnv('MARKETING_TEST_ENTITLEMENTS','true');vi.stubEnv('MARKETING_PORTAL_CONFIGURATION_ID','bpc_test');});
describe('Growth checkout',()=>{
 it('sets exact server prices, recurring interval and explicit consent',()=>{
  expect(marketingPurchaseSchema.safeParse({cadence:'year',locations:1,acceptedTerms:true}).success).toBe(false);
  expect(marketingAmount({cadence:'month',locations:2})).toBe(5800);
  expect(marketingPurchaseSchema.safeParse({cadence:'month',locations:1,acceptedTerms:false}).success).toBe(false);
  expect(marketingPurchaseSchema.safeParse({cadence:'month',locations:1,acceptedTerms:true,price:1}).success).toBe(false);
  const p=addMarketingToCheckout({mode:'payment',customer_creation:'always',invoice_creation:{enabled:true},line_items:[{price:'stand',quantity:1}],metadata:{due_today_cents:'4000'}},{cadence:'month',locations:2,acceptedTerms:true},'account','attempt');
  expect(p.mode).toBe('subscription');expect(p.line_items).toHaveLength(2);expect(p.line_items[1].price_data?.unit_amount).toBe(2900);expect(p.metadata.due_today_cents).toBe('9800');expect(p).not.toHaveProperty('customer_creation');expect(p).not.toHaveProperty('invoice_creation');
 });
 it('does not silently combine two different subscription products',()=>expect(()=>addMarketingToCheckout({mode:'subscription'},{cadence:'month',locations:1,acceptedTerms:true},'a','b')).toThrow('Multi-Link'));
 it('refuses duplicate subscriptions before calling Stripe',async()=>{
  mocks.sql.mockResolvedValueOnce([{id:'account',email:'owner@example.test'}]).mockResolvedValueOnce([{stripe_subscription_id:'sub_existing',status:'active'}]);
  await expect(createMarketingCheckout('owner@example.test',{cadence:'month',locations:1,acceptedTerms:true},'attempt',{mode:'payment'})).rejects.toThrow('already have');expect(mocks.create).not.toHaveBeenCalled();
 });
 it('requires the release switch',async()=>{vi.stubEnv('MARKETING_CHECKOUT_ENABLED','false');await expect(createMarketingCheckout('x@y.test',{cadence:'month',locations:1,acceptedTerms:true},'attempt',{mode:'payment'})).rejects.toThrow('not available');expect(mocks.create).not.toHaveBeenCalled();});
});
describe('Growth entitlement lifecycle',()=>{
 it('only grants access on an active subscription with a paid latest invoice',()=>{
  expect(marketingSubscriptionState(sub()).paid).toBe(true);
  for(const status of ['past_due','unpaid','canceled','incomplete','trialing'])expect(marketingSubscriptionState(sub({status})).paid).toBe(false);
  expect(marketingSubscriptionState(sub({latest_invoice:{status:'open'}})).paid).toBe(false);
  expect(marketingSubscriptionState(sub({pause_collection:{behavior:'void'}})).paid).toBe(false);
  expect(marketingSubscriptionState(sub({cancel_at_period_end:true})).paid).toBe(true);
 });
 it('rejects altered prices and unsupported quantities',()=>{
  const s=sub();s.items.data[0].price.unit_amount=100;expect(()=>marketingSubscriptionState(s)).toThrow('price');
  const q=sub();q.items.data[0].quantity=11;expect(()=>marketingSubscriptionState(q)).toThrow('quantity');
 });
 it('uses current Stripe state rather than a stale paid event',async()=>{
  mocks.retrieve.mockResolvedValue(sub({status:'canceled'}));mocks.sql.mockResolvedValue([{stripe_subscription_id:'sub_growth'}]);
  await syncMarketingSubscription({type:'invoice.paid',data:{object:{parent:{subscription_details:{subscription:'sub_growth',metadata:{tap_rater:'marketing_growth_v1'}}}}}} as unknown as Stripe.Event);
  const write=mocks.sql.mock.calls.find(c=>c[0].join('').includes('WITH saved'))!;expect(write).toContain('inactive');expect(write).not.toContain('active');
 });
 it('does not touch stand-only or unrelated hosted payments',async()=>{
  const r=await syncMarketingSubscription({type:'checkout.session.completed',data:{object:{subscription:'sub_hosted',metadata:{}}}} as unknown as Stripe.Event);expect(r.handled).toBe(false);expect(mocks.retrieve).not.toHaveBeenCalled();expect(mocks.sql).not.toHaveBeenCalled();
 });
 it('rejects a subscription that is not bound to the purchase attempt',async()=>{
  mocks.retrieve.mockResolvedValue(sub());mocks.sql.mockResolvedValue([]);
  await expect(syncMarketingSubscription({type:'customer.subscription.updated',data:{object:sub()}} as unknown as Stripe.Event)).rejects.toThrow('ownership');
 });
 it('extracts subscription ids from current invoice structure',()=>expect(subscriptionEventId({type:'invoice.paid',data:{object:{parent:{subscription_details:{subscription:'sub_123'}}}}} as unknown as Stripe.Event)).toBe('sub_123'));
});
