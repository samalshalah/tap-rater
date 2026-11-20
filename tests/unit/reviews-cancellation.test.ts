import {beforeEach,describe,expect,it,vi} from 'vitest';
import type Stripe from 'stripe';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/lib/marketing-sales',()=>({marketingSalesEnabled:true}));
const m=vi.hoisted(()=>({sql:vi.fn(),retrieve:vi.fn(),notifyNew:vi.fn(),notifyCancel:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>m.sql}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'test',getStripeClient:()=>({subscriptions:{retrieve:m.retrieve}})}));
vi.mock('@/lib/db',()=>({getSupabaseAdmin:()=>({})}));
vi.mock('@/lib/stripe-processing',()=>({withStripeResourceLock:async(_db:unknown,_key:string,fn:any)=>fn(async()=>{})}));
vi.mock('@/lib/reviews-subscription-admin',async original=>({...await original<object>(),notifyNewReviewsSubscription:m.notifyNew,notifyReviewsCancellationChange:m.notifyCancel}));
import {syncMarketingSubscription} from '@/lib/marketing-subscriptions';
// The real function (the module above is partly mocked for the webhook tests).
const realNotify=async(input:Parameters<typeof import('@/lib/reviews-subscription-admin')['notifyReviewsCancellationChange']>[0])=>(await vi.importActual<typeof import('@/lib/reviews-subscription-admin')>('@/lib/reviews-subscription-admin')).notifyReviewsCancellationChange(input);
const sub=(cancel:boolean,status='active')=>({id:'sub_growth',livemode:false,status,customer:'cus_test',metadata:{tap_rater:'marketing_growth_v1',account_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',purchase_attempt:'attempt'},items:{data:[{quantity:1,current_period_end:1900000000,price:{currency:'usd',unit_amount:2900,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{status:'paid'},cancel_at_period_end:cancel}) as unknown as Stripe.Subscription;
const run=async(stored:boolean,next:Stripe.Subscription)=>{m.retrieve.mockResolvedValue(next);m.sql.mockResolvedValue([{stripe_subscription_id:'sub_growth',activation_email_sent_at:'2026-11-14',cancel_at_period_end:stored}]);await syncMarketingSubscription({id:'evt_1',type:'customer.subscription.updated',data:{object:next}} as unknown as Stripe.Event);};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('MARKETING_TEST_ENTITLEMENTS','true');});

describe('cancellation emails from the subscription webhook',()=>{
 it('sends "canceled" when a renewing subscription is set to end',async()=>{await run(false,sub(true));expect(m.notifyCancel).toHaveBeenCalledWith(expect.objectContaining({change:'canceled',eventId:'evt_1',subscriptionId:'sub_growth'}));});
 it('sends "resumed" when the cancellation is undone',async()=>{await run(true,sub(false));expect(m.notifyCancel).toHaveBeenCalledWith(expect.objectContaining({change:'resumed'}));});
 it('sends nothing when nothing changed, or when the subscription has already ended',async()=>{
  await run(false,sub(false));await run(true,sub(true));await run(false,sub(true,'canceled'));
  expect(m.notifyCancel).not.toHaveBeenCalled();
 });
});

it('emails the client and order@ once per Stripe event with the end date',async()=>{
 const send=vi.fn().mockResolvedValue({sent:true});
 const sql=vi.fn().mockResolvedValue([{email:'info@dentalmkt.us',name:'Hussam Alshalah',first_name:'Hussam'}]) as never;
 await realNotify({change:'canceled',subscriptionId:'sub_1',account:'a',end:'2026-12-20T00:00:00.000Z',eventId:'evt_9',mode:'live',sql,send,env:{ORDER_NOTIFICATION_EMAIL:'order@taprater.com'}});
 const [client,admin]=send.mock.calls.map(c=>c[0]);
 expect(client.to).toBe('info@dentalmkt.us');expect(client.html).toContain('December 20, 2026');expect(client.html).toContain('30 days');
 expect(client.delivery.idempotencyKey).toBe('reviews_canceled_customer:evt_9');
 expect(admin.to).toBe('order@taprater.com');expect(admin.subject).toContain('Canceled');expect(admin.delivery.idempotencyKey).toBe('reviews_canceled_admin:evt_9');
});

it('tells past customers when their subscription ended and how to come back',async()=>{
 const {MarketingUpgrade}=await import('@/components/account/marketing-gate');
 const ended=renderToStaticMarkup(createElement(MarketingUpgrade,{endedAt:new Date(Date.now()-2*86400000).toISOString()} as never));
 expect(ended).toContain('Your Google Reviews subscription ended on');expect(ended).toContain('Subscribe again');expect(ended).toContain('href="/google-reviews#plan"');
 const never=renderToStaticMarkup(createElement(MarketingUpgrade,{} as never));
 expect(never).not.toContain('ended');expect(never).not.toContain('not available yet');
});
