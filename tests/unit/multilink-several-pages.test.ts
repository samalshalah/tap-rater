import {describe,expect,it,vi} from 'vitest';
import {buildStripeCheckoutLineItems} from '@/lib/checkout-stripe';
import type {CheckoutCartRow} from '@/lib/checkout';
import {deriveRowLifecycle,readEndedHostedLines,readHostedRowLine,readHostedSubscriptionItems} from '@/lib/hosted-subscription-lifecycle';
import {changeMultiLinkSubscription,planPageChange,type MultiLinkSubscriptionDependencies} from '@/lib/multilink-subscription-actions';

const row=(quantity:number,extra:Partial<CheckoutCartRow>={})=>({productId:'rate-your-experience-stand',optionId:'branded_qr_direct',optionLabel:'Branded',title:'Rate Your Experience Stand',sku:'RYE',destinationMode:'HOSTED',quantity,unitAmountCents:4900,lineSubtotalCents:4900*quantity,monthlyAmountCents:999,shortDescription:'Stand',setup:{},...extra} as unknown as CheckoutCartRow);

describe('checkout: $9.99 per page, not per stand',()=>{
  it('charges one monthly fee per Multi-Link line, tagged with its order line',()=>{
    const items=buildStripeCheckoutLineItems([row(5),row(2)]);
    const monthly=items.filter(item=>item.price_data?.recurring);
    expect(monthly).toHaveLength(2);
    expect(monthly.map(item=>item.quantity)).toEqual([1,1]);
    expect(monthly.map(item=>item.price_data?.unit_amount)).toEqual([999,999]);
    expect(monthly.map(item=>item.price_data?.product_data?.metadata?.order_line)).toEqual(['1','2']);
    expect(items.find(item=>!item.price_data?.recurring)?.quantity).toBe(5);
  });
});

const product=(id:string,line:string)=>({id,metadata:{line_kind:'hosted_subscription',order_line:line}});
const sub=(extra:Record<string,unknown>={})=>({id:'sub_1',status:'active',metadata:{},items:{data:[{id:'si_1',price:{product:product('prod_1','1')}},{id:'si_2',price:{product:product('prod_2','2')}}]},...extra});

describe('reading a subscription that pays for several pages',()=>{
  it('finds each page\'s monthly charge and the line a page was bought on',()=>{
    expect(readHostedSubscriptionItems(sub() as never)).toEqual([{id:'si_1',line:'1',productId:'prod_1'},{id:'si_2',line:'2',productId:'prod_2'}]);
    expect(readHostedRowLine('cs_live_abc:line:2')).toBe('2');
    expect(readHostedRowLine('cs_live_abc')).toBeUndefined();
    expect(readEndedHostedLines({tr_line_2_end:'period_end:prod_2',other:'x',tr_line_3_end:'bad'})).toEqual({'2':{mode:'period_end',productId:'prod_2'}});
  });
});

describe('planPageChange',()=>{
  it('removes only this page\'s charge and notes how it ends',()=>{
    expect(planPageChange(sub() as never,'cancel_at_period_end','2')).toEqual({kind:'page',params:{items:[{id:'si_2',deleted:true}],proration_behavior:'none',metadata:{tr_line_2_end:'period_end:prod_2'}}});
    expect(planPageChange(sub() as never,'cancel_now','1')).toMatchObject({kind:'page',params:{metadata:{tr_line_1_end:'now:prod_1'}}});
  });
  it('puts the charge back when the page is kept',()=>{
    const cancelled=sub({metadata:{tr_line_2_end:'period_end:prod_2'},items:{data:[{id:'si_1',price:{product:product('prod_1','1')}}]}});
    expect(planPageChange(cancelled as never,'keep','2')).toEqual({kind:'page',params:{items:[{price_data:{currency:'usd',product:'prod_2',recurring:{interval:'month'},unit_amount:999},quantity:1}],proration_behavior:'none',metadata:{tr_line_2_end:''}}});
    expect(planPageChange(sub({metadata:{tr_line_2_end:'now:prod_2'},items:{data:[{id:'si_1',price:{product:product('prod_1','1')}}]}}) as never,'keep','2')).toMatchObject({kind:'refused'});
  });
  it('acts on the whole subscription for the last page, and for single-page checkouts',()=>{
    const one=sub({items:{data:[{id:'si_1',price:{product:product('prod_1','1')}}]}});
    expect(planPageChange(one as never,'cancel_at_period_end','1')).toEqual({kind:'subscription'});
    expect(planPageChange(sub() as never,'cancel_at_period_end',undefined)).toEqual({kind:'subscription'});
  });
  it('lets "end now" finish a page that was already ending',()=>{
    const ending=sub({metadata:{tr_line_2_end:'period_end:prod_2'},items:{data:[{id:'si_1',price:{product:product('prod_1','1')}}]}});
    expect(planPageChange(ending as never,'cancel_now','2')).toEqual({kind:'page',params:{metadata:{tr_line_2_end:'now:prod_2'}}});
    expect(planPageChange(ending as never,'cancel_at_period_end','2')).toEqual({kind:'page',params:null});
  });
});

describe('changeMultiLinkSubscription for one page',()=>{
  it('updates Stripe for the page only and keeps the subscription',async()=>{
    const deps={retrieve:vi.fn().mockResolvedValue(sub()),update:vi.fn().mockResolvedValue({}),cancel:vi.fn(),sync:vi.fn().mockResolvedValue({ok:true,processed:true})} as unknown as MultiLinkSubscriptionDependencies;
    expect(await changeMultiLinkSubscription('sub_1','cancel_now',deps,'2')).toEqual({ok:true,synced:true});
    expect(deps.cancel).not.toHaveBeenCalled();
    expect(deps.update).toHaveBeenCalledWith('sub_1',expect.objectContaining({items:[{id:'si_2',deleted:true}]}));
    expect(deps.sync).toHaveBeenCalledWith(expect.objectContaining({eventType:'customer.subscription.updated'}));
  });
});

describe('deriveRowLifecycle',()=>{
  const base={subscriptionId:'sub_1',status:'active',lifecycleStatus:'ACTIVE' as const,currentPeriodEnd:'2027-01-25T00:00:00.000Z',cancelAtPeriodEnd:false,pastDueSince:null};
  const row={stripe_checkout_session_id:'cs_1:line:2',current_period_end:'2026-12-25T00:00:00.000Z'};
  it('keeps a cancelled page live until its own paid-through date, then ends it',()=>{
    const meta={tr_line_2_end:'period_end:prod_2'};
    expect(deriveRowLifecycle(base,row,meta,new Date('2026-12-01'))).toMatchObject({status:'active',lifecycleStatus:'CANCELLED_AT_PERIOD_END',cancelAtPeriodEnd:true,currentPeriodEnd:'2026-12-25T00:00:00.000Z'});
    expect(deriveRowLifecycle(base,row,meta,new Date('2026-12-26'))).toMatchObject({status:'canceled',lifecycleStatus:'EXPIRED'});
  });
  it('ends a page today with "end now", and leaves the other pages alone',()=>{
    expect(deriveRowLifecycle(base,row,{tr_line_2_end:'now:prod_2'},new Date('2026-12-01'))).toMatchObject({status:'canceled',lifecycleStatus:'EXPIRED'});
    expect(deriveRowLifecycle(base,{...row,stripe_checkout_session_id:'cs_1:line:1'},{tr_line_2_end:'now:prod_2'},new Date())).toBe(base);
  });
});
