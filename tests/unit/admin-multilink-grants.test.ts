import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),sql:vi.fn(),storage:vi.fn(),placeholder:vi.fn()}));
vi.mock('@/lib/hosted-pages/app-storage',()=>({getHostedPageStorage:mocks.storage}));
vi.mock('@/lib/hosted-pages/placeholder',()=>({ensureHostedPagePlaceholder:mocks.placeholder}));
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:mocks.auth}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
import {POST} from '@/app/api/admin/multilink-grants/route';
const body={customerId:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000002',businessName:'Test business',expiresAt:null as string|null};
const request=(value=body,origin='https://taprater.com')=>new Request('https://taprater.com/api/admin/multilink-grants',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(null);mocks.sql.mockResolvedValue([{id:'licence'}]);});
it('requires admin authentication',async()=>{mocks.auth.mockResolvedValue(new Response(null,{status:401}));expect((await POST(request())).status).toBe(401);expect(mocks.sql).not.toHaveBeenCalled();});
it('rejects cross-origin requests',async()=>{expect((await POST(request(body,'https://other.test'))).status).toBe(403);expect(mocks.sql).not.toHaveBeenCalled();});
it('rejects expired grants',async()=>{expect((await POST(request({...body,expiresAt:'2000-01-01T00:00:00Z'}))).status).toBe(400);expect(mocks.sql).not.toHaveBeenCalled();});
it('creates an owner-scoped draft with an idempotent admin reference',async()=>{expect((await POST(request())).status).toBe(200);const [strings,...values]=mocks.sql.mock.calls[0];expect(strings.join(' ')).toContain('draft_json');expect(strings.join(' ')).toContain('customer_id=');expect(values).toContain(body.customerId);expect(values).toContain(`admin:${body.requestId}`);expect(strings.join(' ')).not.toContain('published_at');expect(strings.join(' ')).toContain('INSERT INTO hosted_page_codes');expect(strings.join(' ')).toContain('CROSS JOIN page_code');});
it('rejects unavailable accounts and other-account retries',async()=>{mocks.sql.mockResolvedValue([]);expect((await POST(request())).status).toBe(409);});
it('records the chosen stand and uses its wording as the page heading',async()=>{
 expect((await POST(request({...body,standSlug:'rate-your-experience-stand'} as typeof body))).status).toBe(200);
 const values=mocks.sql.mock.calls[0].slice(1);
 expect(values).toContain(`admin-stand:rate-your-experience-stand:${body.requestId}`);
 expect(values).toContain(`admin:${body.requestId}`);
 expect(values.find(value=>typeof value==='string'&&value.includes('"headline"'))).toContain('Rate Your Experience');
});
it('rejects a stand that is not a Multi-Link stand',async()=>{expect((await POST(request({...body,standSlug:'not-a-stand'} as typeof body))).status).toBe(400);expect(mocks.sql).not.toHaveBeenCalled();});

it('makes the new permanent link live straight away',async()=>{
 mocks.storage.mockResolvedValue({});mocks.sql.mockResolvedValue([{id:'licence',hosted_page_id:'page-1',permanent_code:'6Y2XVQS9QHKM'}]);
 const response=await POST(request({...body,standSlug:'rate-your-experience-stand'} as typeof body));
 expect(await response.json()).toMatchObject({granted:true,linkLive:true,url:'https://taprater.com/p/6Y2XVQS9QHKM'});
 expect(mocks.placeholder).toHaveBeenCalledWith({},expect.objectContaining({code:'6Y2XVQS9QHKM',physicalProductRef:'page-1',businessName:'Test business',headline:'Rate Your Experience'}));
});
it('still grants when the link cannot be made live yet',async()=>{
 mocks.storage.mockResolvedValue({});mocks.placeholder.mockRejectedValue(new Error('r2 down'));mocks.sql.mockResolvedValue([{id:'licence',hosted_page_id:'page-1',permanent_code:'6Y2XVQS9QHKM'}]);
 const response=await POST(request());
 expect(response.status).toBe(200);expect((await response.json()).linkLive).toBe(false);
});
