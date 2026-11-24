import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({customer:vi.fn(),admin:vi.fn(),context:vi.fn(),storage:vi.fn(),placeholder:vi.fn(),sql:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:mocks.customer}));
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:mocks.admin}));
vi.mock('@/lib/hosted-page-editor',()=>({getHostedPageEditorContext:mocks.context}));
vi.mock('@/lib/hosted-pages/app-storage',()=>({getHostedPageStorage:mocks.storage}));
vi.mock('@/lib/hosted-pages/placeholder',()=>({ensureHostedPagePlaceholder:mocks.placeholder}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
import {POST as customerQr} from '@/app/api/account/hosted-page/qr/route';
import {POST as adminQr} from '@/app/api/admin/multilink-licences/qr/route';

const code='6Y2XVQS9QHKM',customerId='00000000-0000-4000-8000-000000000001';
const req=(url:string,body:unknown,origin='https://taprater.com')=>new Request(`https://taprater.com${url}`,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const page={id:'page-1',code,customerId:'c1',businessName:'Biz',lifecycleStatus:'ACTIVE',draft:{businessName:'Priority Toyota',headline:'Rate Your Experience',logoUrl:'/uploads/logo.png',buttons:[],appearance:{}}};
beforeEach(()=>{vi.resetAllMocks();mocks.customer.mockResolvedValue({session:{email:'owner@example.com'}});mocks.admin.mockResolvedValue(null);mocks.storage.mockResolvedValue({});mocks.placeholder.mockResolvedValue('published');});

describe('client QR download',()=>{
  it('returns a QR for the permanent link after making it live',async()=>{
    mocks.context.mockResolvedValue({configured:true,page});
    const response=await customerQr(req('/api/account/hosted-page/qr',{code}));
    const body=await response.json();
    expect(response.status).toBe(200);
    expect(body.url).toBe(`https://taprater.com/p/${code}`);
    expect(body.svg).toContain('<svg');
    expect(mocks.context).toHaveBeenCalledWith('owner@example.com',code);
    expect(mocks.placeholder).toHaveBeenCalledWith({},expect.objectContaining({code,physicalProductRef:'page-1',businessName:'Priority Toyota',headline:'Rate Your Experience',logoUrl:undefined}));
  });
  it('refuses pages the customer does not own',async()=>{
    mocks.context.mockResolvedValue({configured:true,page:null});
    expect((await customerQr(req('/api/account/hosted-page/qr',{code}))).status).toBe(404);
    expect(mocks.placeholder).not.toHaveBeenCalled();
  });
  it('rejects bad codes and other origins',async()=>{
    expect((await customerQr(req('/api/account/hosted-page/qr',{code:'nope'}))).status).toBe(400);
    expect((await customerQr(req('/api/account/hosted-page/qr',{code},'https://evil.test'))).status).toBe(403);
  });
});

describe('admin QR download',()=>{
  it('requires admin',async()=>{
    mocks.admin.mockResolvedValue(new Response(null,{status:401}));
    expect((await adminQr(req('/api/admin/multilink-licences/qr',{customerId,code}))).status).toBe(401);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('loads the client page, makes the link live and returns the QR',async()=>{
    mocks.sql.mockResolvedValue([{id:'page-1',lifecycle_status:'ACTIVE',business_name:'Priority Toyota',headline:'Rate Your Experience',logo_url:null}]);
    const response=await adminQr(req('/api/admin/multilink-licences/qr',{customerId,code}));
    expect(response.status).toBe(200);
    expect((await response.json()).svg).toContain('<svg');
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual([code,customerId]);
    expect(mocks.placeholder).toHaveBeenCalledWith({},expect.objectContaining({code,physicalProductRef:'page-1'}));
  });
  it('reports a licence that is not this client’s',async()=>{
    mocks.sql.mockResolvedValue([]);
    expect((await adminQr(req('/api/admin/multilink-licences/qr',{customerId,code}))).status).toBe(404);
  });
});
