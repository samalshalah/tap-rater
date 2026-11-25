import {describe,expect,it,vi} from 'vitest';
import {changeMultiLinkSubscription,type MultiLinkSubscriptionDependencies} from '@/lib/multilink-subscription-actions';
import {refundAdminOrder,type AdminOrderRefundDependencies} from '@/lib/order-refunds';
import type {OrderRecord} from '@/lib/orders';

const deps=(status='active'):MultiLinkSubscriptionDependencies&{[k:string]:ReturnType<typeof vi.fn>}=>({
  update:vi.fn().mockResolvedValue({}),cancel:vi.fn().mockResolvedValue({}),
  retrieve:vi.fn().mockResolvedValue({status}),sync:vi.fn().mockResolvedValue({ok:true,processed:true}),
});

describe('changeMultiLinkSubscription',()=>{
  it('stops renewal and syncs the page without waiting for the webhook',async()=>{
    const d=deps();
    expect(await changeMultiLinkSubscription('sub_123','cancel_at_period_end',d)).toEqual({ok:true,synced:true});
    expect(d.update).toHaveBeenCalledWith('sub_123',{cancel_at_period_end:true});
    expect(d.sync).toHaveBeenCalledWith(expect.objectContaining({eventType:'customer.subscription.updated',object:{id:'sub_123'}}));
  });
  it('undoes a cancellation',async()=>{
    const d=deps();await changeMultiLinkSubscription('sub_123','keep',d);
    expect(d.update).toHaveBeenCalledWith('sub_123',{cancel_at_period_end:false});
  });
  it('ends the subscription today',async()=>{
    const d=deps();await changeMultiLinkSubscription('sub_123','cancel_now',d);
    expect(d.cancel).toHaveBeenCalledWith('sub_123');
    expect(d.sync).toHaveBeenCalledWith(expect.objectContaining({eventType:'customer.subscription.deleted'}));
  });
  it('does not cancel twice, and refuses to keep an ended one',async()=>{
    const d=deps('canceled');
    expect((await changeMultiLinkSubscription('sub_123','cancel_now',d)).ok).toBe(true);
    expect(d.cancel).not.toHaveBeenCalled();
    expect(await changeMultiLinkSubscription('sub_123','keep',d)).toMatchObject({ok:false,status:409});
  });
  it('refuses granted and manual pages',async()=>{
    const d=deps();
    expect(await changeMultiLinkSubscription('admin:abc','cancel_now',d)).toMatchObject({ok:false,status:409});
    expect(d.retrieve).not.toHaveBeenCalled();
  });
  it('still succeeds when the sync fails (the webhook finishes it)',async()=>{
    const d=deps();(d.sync as ReturnType<typeof vi.fn>).mockResolvedValue({ok:false,error:'locked'});
    expect(await changeMultiLinkSubscription('sub_123','cancel_now',d)).toEqual({ok:true,synced:false});
  });
});

describe('refundAdminOrder on a subscription order',()=>{
  const order={id:'2e44f2b3-95af-44d0-aa9d-051c14002dcd',status:'paid',payment_status:'paid',total_cents:6193,stripe_checkout_session_id:'cs_live_1',stripe_payment_intent_id:null} as unknown as OrderRecord;
  it('finds the payment through the invoice, then refunds it',async()=>{
    let linked:string|null=null;
    const d:AdminOrderRefundDependencies={
      getOrder:vi.fn(async()=>({configured:true,order:{...order,stripe_payment_intent_id:linked}})) as never,
      linkPaymentIntent:vi.fn(async()=>{linked='pi_1';return 'pi_1';}),
      listRefunds:vi.fn().mockResolvedValue([]),
      createRefund:vi.fn().mockResolvedValue({id:'re_1',amount:6193,status:'succeeded',created:1}),
      saveRefunds:vi.fn().mockResolvedValue({refundId:'re_1',refundStatus:'succeeded',paymentStatus:'refunded'}),
      withLock:async(_key,work)=>work(async()=>undefined),
    };
    expect(await refundAdminOrder(order.id!,d)).toMatchObject({ok:true,refundId:'re_1'});
    expect(d.createRefund).toHaveBeenCalledWith('pi_1',order.id,expect.any(String));
  });
  it('explains when no payment can be found',async()=>{
    const d={getOrder:vi.fn(async()=>({configured:true,order})),linkPaymentIntent:vi.fn().mockResolvedValue(null)} as unknown as AdminOrderRefundDependencies;
    expect(await refundAdminOrder(order.id!,d)).toMatchObject({ok:false,status:409});
  });
});
