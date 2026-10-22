import {describe,it,expect,vi,afterEach} from 'vitest';
const {auth,admin,publish,sync,bind}=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),publish:vi.fn(),sync:vi.fn(),bind:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:auth}));
vi.mock('@/lib/google-business/http',()=>({googleAdminIdentity:admin}));
vi.mock('@/lib/google-business/live-reviews',async original=>({...await original<object>(),publishLiveReply:publish,syncLiveReviews:sync,bindGoogleLocation:bind}));
import {handleLiveReviews} from '@/lib/google-business/live-http';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const request=(body:unknown,origin='https://taprater.com')=>new Request('https://taprater.com/api/account/reviews/live',{method:'POST',headers:{origin},body:JSON.stringify(body)});
afterEach(()=>vi.clearAllMocks());
describe('live review HTTP boundaries',()=>{
 it('rejects signed-out customers and admin preview bypass',async()=>{
  auth.mockResolvedValue({response:Response.json({}, {status:401})});admin.mockResolvedValue(null);expect((await handleLiveReviews(request({}),'customer')).status).toBe(401);expect((await handleLiveReviews(request({}),'admin')).status).toBe(401);
 });
 it('rejects cross-origin changes',async()=>{auth.mockResolvedValue({session:{email:'owner@example.com'}});expect((await handleLiveReviews(request({action:'sync',businessId:id},'https://evil.example'),'customer')).status).toBe(403);expect(sync).not.toHaveBeenCalled();});
 it('does not let customers enumerate or assign agency locations',async()=>{auth.mockResolvedValue({session:{email:'owner@example.com'}});expect((await handleLiveReviews(request({action:'accounts'}),'customer')).status).toBe(403);expect(bind).not.toHaveBeenCalled();});
 it('requires explicit public reply confirmation',async()=>{auth.mockResolvedValue({session:{email:'owner@example.com'}});expect((await handleLiveReviews(request({action:'publish',id,version:2}),'customer')).status).toBe(400);expect(publish).not.toHaveBeenCalled();});
 it('does not accept injected Google paths or publish text',async()=>{auth.mockResolvedValue({session:{email:'owner@example.com'}});expect((await handleLiveReviews(request({action:'publish',id,version:2,confirmPublicReply:true,resource:'accounts/another/locations/another/reviews/r',draft:'Injected'}),'customer')).status).toBe(400);expect(publish).not.toHaveBeenCalled();});
 it('keeps client publishing blocked even with explicit confirmation',async()=>{auth.mockResolvedValue({session:{email:'owner@example.com'}});publish.mockResolvedValue({published:true});expect((await handleLiveReviews(request({action:'publish',id,version:2,confirmPublicReply:true}),'customer')).status).toBe(403);expect(publish).not.toHaveBeenCalled();});
});
