import {describe,expect,it,vi} from 'vitest';
import {readMultiLinkChange} from '@/lib/hosted-subscription-lifecycle';
import {notifyMultiLinkSubscriptionChange} from '@/lib/multilink-cancellation-emails';

describe('readMultiLinkChange',()=>{
  it('emails only when something changed',()=>{
    expect(readMultiLinkChange({status:'active',cancel_at_period_end:false},{status:'active',cancelAtPeriodEnd:true})).toBe('canceled');
    expect(readMultiLinkChange({status:'active',cancel_at_period_end:true},{status:'active',cancelAtPeriodEnd:true})).toBeNull();
    expect(readMultiLinkChange({status:'active',cancel_at_period_end:true},{status:'active',cancelAtPeriodEnd:false})).toBe('resumed');
    expect(readMultiLinkChange({status:'active',cancel_at_period_end:true},{status:'canceled',cancelAtPeriodEnd:false})).toBe('ended');
    expect(readMultiLinkChange({status:'canceled'},{status:'canceled',cancelAtPeriodEnd:false})).toBeNull();
    expect(readMultiLinkChange({status:'active'},{status:'past_due',cancelAtPeriodEnd:false})).toBeNull();
  });
});

describe('notifyMultiLinkSubscriptionChange',()=>{
  const sql=vi.fn().mockResolvedValue([{email:'owner@example.com',name:'Sam Owner',first_name:'Sam',business_name:'Priority Toyota'}]) as never;
  const input={change:'canceled' as const,hostedSubscriptionId:'0183c8fb-0000-4000-8000-000000000000',stripeSubscriptionId:'sub_1',code:'ZGBC6FKZH7T3',pageUrl:'https://taprater.com/p/ZGBC6FKZH7T3',end:'2026-12-25T00:57:37Z',eventId:'evt_1'};
  it('tells the customer the page stays active until the end date, and tells admin',async()=>{
    const send=vi.fn().mockResolvedValue({ok:true});
    await notifyMultiLinkSubscriptionChange(input,{sql,send,env:{ORDER_NOTIFICATION_EMAIL:'order@example.com'}});
    expect(send).toHaveBeenCalledTimes(2);
    const [customer,admin]=send.mock.calls.map(call=>call[0]);
    expect(customer.to).toBe('owner@example.com');
    expect(customer.html).toContain('stays active until December 25, 2026');
    expect(customer.delivery.idempotencyKey).toBe('multilink_canceled_customer:evt_1');
    expect(admin.to).toBe('order@example.com');
    expect(admin.subject).toBe('Canceled: Multi-Link · Priority Toyota (ZGBC6FKZH7T3)');
  });
  it('says the page has ended when the subscription is over',async()=>{
    const send=vi.fn().mockResolvedValue({ok:true});
    await notifyMultiLinkSubscriptionChange({...input,change:'ended'},{sql,send,env:{}});
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].subject).toBe('Your Multi-Link page has ended');
  });
});
