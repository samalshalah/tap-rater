import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),sql:vi.fn()}));
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:mocks.auth}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
import {POST} from '@/app/api/admin/orders/[id]/cancel/route';
import {orderCancelBlock} from '@/lib/order-admin-cancel';
import {isUnfinishedCheckout} from '@/lib/customer-portal-normalizers';

const id='7d03f25a-2fef-45a6-b03b-1a8df3f75c1f';
const call=(body:unknown={confirmation:'CANCEL'},origin='https://taprater.com')=>POST(new Request(`https://taprater.com/api/admin/orders/${id}/cancel`,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({id})});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(null);});

describe('admin order cancel',()=>{
  it('allows only orders with no real charge that have not shipped',()=>{
    const order={status:'pending_payment',payment_status:'manual_unpaid',shipping_status:'not_shipped',stripe_checkout_session_id:'manual_1'};
    expect(orderCancelBlock(order)).toBeUndefined();
    expect(orderCancelBlock({...order,status:'paid',payment_status:'complimentary',stripe_checkout_session_id:'comp_1'})).toBeUndefined();
    expect(orderCancelBlock({...order,status:'paid',payment_status:'paid',stripe_checkout_session_id:'cs_test_1'})).toBeUndefined();
    expect(orderCancelBlock({...order,status:'paid',payment_status:'paid',stripe_checkout_session_id:'cs_live_1'})).toContain('Refund');
    expect(orderCancelBlock({...order,shipping_status:'shipped'})).toBe('Order has shipped.');
    expect(orderCancelBlock({...order,status:'canceled'})).toBe('Order is already cancelled.');
  });
  it('hides a cancelled order from the client’s stands',()=>{
    expect(isUnfinishedCheckout({status:'canceled',paymentStatus:'canceled'})).toBe(true);
    expect(isUnfinishedCheckout({status:'paid',paymentStatus:'complimentary'})).toBe(false);
    expect(isUnfinishedCheckout({status:'canceled',paymentStatus:'refunded'})).toBe(false);
  });
  it('requires admin, same origin and an explicit confirm',async()=>{
    expect((await call({})).status).toBe(400);
    expect((await call(undefined,'https://evil.test')).status).toBe(403);
    mocks.auth.mockResolvedValue(new Response(null,{status:401}));
    expect((await call()).status).toBe(401);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('cancels in one guarded statement and records it in notes',async()=>{
    mocks.sql.mockResolvedValue([{id}]);
    expect((await call()).status).toBe(200);
    const [strings,...values]=mocks.sql.mock.calls[0];const text=strings.join(' ');
    expect(values).toContain(id);
    for(const guard of ["status<>'canceled'","'shipped','delivered'","cs_test_%","'manual_unpaid','complimentary','unpaid'",'hosted_subscriptions','hosted_page_codes','internal_notes'])expect(text).toContain(guard);
  });
  it('reports orders that cannot be cancelled',async()=>{mocks.sql.mockResolvedValue([]);expect((await call()).status).toBe(409);});
});
