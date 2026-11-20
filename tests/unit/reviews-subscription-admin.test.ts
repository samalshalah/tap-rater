import {expect,it,vi} from 'vitest';
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>vi.fn()}));
vi.mock('@/lib/commerce-email-outbox',()=>({sendCommerceEmail:vi.fn()}));
import {notifyNewReviewsSubscription} from '@/lib/reviews-subscription-admin';
const sql=vi.fn().mockResolvedValue([{email:'info@dentalmkt.us',name:'Test Buyer',business:'University Barber Shop'}]) as never;
it('emails the order address once per subscription with the sale details',async()=>{
 const send=vi.fn().mockResolvedValue({sent:true});
 await notifyNewReviewsSubscription({subscriptionId:'sub_123',account:'11111111-1111-4111-8111-111111111111',locations:2,mode:'live',sql,send,env:{ORDER_NOTIFICATION_EMAIL:'order@taprater.com'}});
 const input=send.mock.calls[0][0];
 expect(input.to).toBe('order@taprater.com');expect(input.subject).toContain('Test Buyer');expect(input.replyTo).toBe('info@dentalmkt.us');
 expect(input.html).toContain('University Barber Shop');expect(input.html).toContain('$58.00');
 expect(input.delivery).toMatchObject({audience:'admin',idempotencyKey:'reviews_subscription_admin:sub_123'});
});
it('does nothing when no order notification address is configured',async()=>{
 const send=vi.fn();
 expect(await notifyNewReviewsSubscription({subscriptionId:'sub_123',account:'11111111-1111-4111-8111-111111111111',locations:1,mode:'live',sql,send,env:{}})).toMatchObject({sent:false});
 expect(send).not.toHaveBeenCalled();
});

import {multiLinkBilling} from '@/lib/reviews-subscription-admin';
it('tells Stripe, manual-order and complimentary Multi-Link pages apart',()=>{
 expect(multiLinkBilling('sub_1Q2w3e')).toBe('stripe');
 expect(multiLinkBilling('manual:TR-260901-07ABC')).toBe('manual');
 expect(multiLinkBilling('manual:comp_123')).toBe('complimentary');
 expect(multiLinkBilling('admin:grant-9')).toBe('complimentary');
});
