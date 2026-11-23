import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),sql:vi.fn()}));
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:mocks.auth}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
import {DELETE,GET} from '@/app/api/admin/multilink-licences/route';
import {removalBlock} from '@/lib/admin-multilink-licences';

const customerId='00000000-0000-4000-8000-000000000001';
const url=`https://taprater.com/api/admin/multilink-licences`;
const del=(body:unknown,origin='https://taprater.com')=>DELETE(new Request(url,{method:'DELETE',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(null);});

describe('admin Multi-Link licences',()=>{
  it('requires admin for listing and removing',async()=>{
    mocks.auth.mockResolvedValue(new Response(null,{status:401}));
    expect((await GET(new Request(`${url}?customerId=${customerId}`))).status).toBe(401);
    expect((await del({customerId,code:'GDGKSG8TVYAG'})).status).toBe(401);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('lists licences with what blocks removal',async()=>{
    mocks.sql.mockResolvedValue([
      {code:'GDGKSG8TVYAG',business_name:'Tap Rater Demo',reference:'admin:x',published:false,links:0,invoices:0,created_at:'2026-11-23'},
      {code:'P7AABGK8ZDVT',business_name:'Bingo Tires',reference:'manual:TR-1',published:false,links:5,invoices:0,created_at:'2026-09-01'},
      {code:'ABCDEFGHJKMN',business_name:'Paid',reference:'sub_123',published:true,links:3,invoices:2,created_at:'2026-09-01'}
    ]);
    const body=await (await GET(new Request(`${url}?customerId=${customerId}`))).json();
    expect(body.licences.map((l:{removable:boolean})=>l.removable)).toEqual([true,true,false]);
    expect(body.licences[2].blockedReason).toContain('Stripe');
    expect(mocks.sql.mock.calls[0].slice(1)).toContain(customerId);
  });
  it('removes one owned licence with guards in the same statement',async()=>{
    mocks.sql.mockResolvedValue([{code:'GDGKSG8TVYAG'}]);
    const response=await del({customerId,code:'GDGKSG8TVYAG'});
    expect(response.status).toBe(200);
    const [strings,...values]=mocks.sql.mock.calls[0];const text=strings.join(' ');
    expect(values).toEqual(expect.arrayContaining([customerId,'GDGKSG8TVYAG']));
    for(const guard of ["LIKE 'admin:%'","published_at IS NULL",'hosted_page_snapshots','billing_invoices','billing_invoice_items','retired_at=now()'])expect(text).toContain(guard);
    expect(text).not.toContain('DELETE FROM businesses');
    expect(mocks.sql).toHaveBeenCalledTimes(1);
  });
  it('reports a licence that cannot be removed',async()=>{mocks.sql.mockResolvedValue([]);expect((await del({customerId,code:'GDGKSG8TVYAG'})).status).toBe(409);});
  it('rejects cross-origin and malformed requests',async()=>{
    expect((await del({customerId,code:'GDGKSG8TVYAG'},'https://evil.test')).status).toBe(403);
    expect((await del({customerId,code:'bad'})).status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('explains each block',()=>{
    expect(removalBlock({source:'admin',published:true,invoices:0})).toBe('Page has been published.');
    expect(removalBlock({source:'manual',published:false,invoices:1})).toBe('Licence has invoices.');
    expect(removalBlock({source:'admin',published:false,invoices:0})).toBeUndefined();
  });
});
