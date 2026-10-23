import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({sql:vi.fn(),sync:vi.fn(),profile:vi.fn(),auth:vi.fn(),gate:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:m.auth}));
vi.mock('@/lib/customer-marketing-access',()=>({withMarketingAccess:m.gate}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>m.sql,syncLiveReviews:m.sync}));
vi.mock('@/lib/google-business/profile-management',()=>({mutateProfile:m.profile}));
import {POST,GET} from '@/app/api/account/onboarding/route';
const ready={business_id:'123',connected:true,synced_at:'2026-10-23',next_page:null,last_error:null,profile_synced:'2026-10-23'};
const request=(action:string)=>new Request('https://taprater.com/api/account/onboarding',{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify({action})});
beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({session:{email:'buyer@example.test'}});m.gate.mockImplementation((_r,fn)=>fn());m.sql.mockResolvedValue([ready]);});
describe('first login setup',()=>{
 it('keeps unpaid accounts behind the access gate',async()=>{m.gate.mockResolvedValue(new Response(null,{status:403}));expect((await GET(new Request('https://taprater.com'))).status).toBe(403);expect(m.sql).not.toHaveBeenCalled();});
 it('cannot finish without a connected location',async()=>{m.sql.mockResolvedValue([{...ready,connected:false}]);expect((await POST(request('finish'))).status).toBe(400);expect(m.sql).toHaveBeenCalledTimes(1);});
 it('cannot finish a partial import or missing profile',async()=>{for(const patch of [{next_page:'page2'},{profile_synced:null},{last_error:'quota'}]){m.sql.mockResolvedValue([{...ready,...patch}]);expect((await POST(request('finish'))).status).toBe(400);}});
 it('imports profile and reviews using the authenticated customer identity only',async()=>{m.sql.mockResolvedValue([{...ready,synced_at:null,profile_synced:null}]);expect((await POST(request('import'))).status).toBe(200);expect(m.profile).toHaveBeenCalledWith({kind:'customer',email:'buyer@example.test'},{action:'refresh',businessId:'123'});expect(m.sync).toHaveBeenCalledWith({kind:'customer',email:'buyer@example.test'},'123');});
 it('rejects injected business ids',async()=>{const r=new Request('https://taprater.com/api/account/onboarding',{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify({action:'finish',businessId:'another-client'})});expect((await POST(r)).status).toBe(400);expect(m.sql).not.toHaveBeenCalled();});
 it('finishes only the authenticated account after a complete import',async()=>{expect((await POST(request('finish'))).status).toBe(200);const update=m.sql.mock.calls.find(c=>c[0].join('').includes('SET marketing_onboarding_completed_at'));expect(update).toContain('buyer@example.test');expect(m.sync).not.toHaveBeenCalled();});
});
