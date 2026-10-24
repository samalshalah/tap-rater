vi.mock('@/lib/customer-marketing-access',()=>({withMarketingAccess:(_request:Request,handler:()=>Promise<Response>)=>handler()}));
import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({identity:vi.fn(),origin:vi.fn(),sql:vi.fn(),summary:vi.fn(),begin:vi.fn(),bind:vi.fn(),client:vi.fn(),set:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({set:m.set})}));
vi.mock('@/lib/google-business/customer-connection',()=>({googleCustomerIdentity:m.identity,customerFlowCookie:'flow'}));
vi.mock('@/lib/google-business/http',()=>({googleSameOrigin:m.origin}));
vi.mock('@/lib/google-business/connection',()=>({beginGoogleConnection:m.begin,googleConnectionSummary:m.summary}));
vi.mock('@/lib/google-business/live-reviews',async original=>({...await original<object>(),liveDb:()=>m.sql,clientFor:m.client,bindGoogleLocation:m.bind}));
import {GET,POST} from '@/app/api/account/google-business/route';
const identity={owner:'customer:one@example.com',email:'one@example.com',session:'signed-one'};
const businessId='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const scoped=identity.owner+':location:'+businessId;
const req=(body:unknown)=>new Request('https://taprater.com/api/account/google-business',{method:'POST',body:JSON.stringify({businessId,...body as object})});
beforeEach(()=>{vi.clearAllMocks();m.identity.mockResolvedValue(identity);m.origin.mockReturnValue(true);m.sql.mockResolvedValue([{id:businessId,connection_owner:null}]);m.summary.mockResolvedValue(null);});
describe('customer Google setup endpoint',()=>{
 it('requires confirmation and disconnects only this customer connection while preserving saved content',async()=>{
  expect((await POST(req({action:'disconnect'}))).status).toBe(400);expect(m.sql).not.toHaveBeenCalled();
  expect((await POST(req({action:'disconnect',confirm:true,owner:'other'}))).status).toBe(400);
  expect((await POST(req({action:'disconnect',confirm:true}))).status).toBe(200);
  const call=m.sql.mock.calls[1],query=call[0].join('?');expect(call.slice(1)).toEqual([businessId,scoped,scoped,scoped,scoped]);
  expect(query).toContain('SET enabled=false');expect(query).toContain('DELETE FROM google_business_connections');expect(query).not.toContain('DELETE FROM google_live_reviews');expect(query).not.toContain('DELETE FROM google_profile_drafts');
 });
 it('requires active customer authentication',async()=>{m.identity.mockResolvedValue(null);expect((await GET(new Request("https://taprater.com/api/account/google-business"))).status).toBe(401);expect((await POST(req({action:'connect'}))).status).toBe(401);expect(m.sql).not.toHaveBeenCalled();});
 it('lists only the signed-in customer workspaces',async()=>{expect((await GET(new Request("https://taprater.com/api/account/google-business"))).status).toBe(200);expect(m.sql.mock.calls[0]).toContain(identity.email);expect(m.summary).not.toHaveBeenCalled();});
 it('rejects cross-origin connections',async()=>{m.origin.mockReturnValue(false);expect((await POST(req({action:'connect'}))).status).toBe(403);expect(m.begin).not.toHaveBeenCalled();});
 it('binds OAuth to customer identity and session and sets protected state cookie',async()=>{m.begin.mockResolvedValue('https://accounts.google.com/auth?state=nonce');expect((await POST(req({action:'connect'}))).status).toBe(200);expect(m.begin).toHaveBeenCalledWith(scoped,identity.session);expect(m.set).toHaveBeenCalledWith('flow','nonce',expect.objectContaining({httpOnly:true,secure:true,sameSite:'lax',maxAge:600}));});
 it('passes trusted customer email to binding, never a supplied owner',async()=>{const body={action:'bind',businessId:'9fb3ee3b-0920-4db5-a03d-7245987a8751',account:'accounts/a',location:'locations/l',confirmAssignment:true};m.bind.mockResolvedValue({linked:true});expect((await POST(req(body))).status).toBe(200);expect(m.bind).toHaveBeenCalledWith(scoped,body.businessId,body.account,body.location,m.sql,m.client,identity.email);expect((await POST(req({...body,owner:'admin'}))).status).toBe(400);expect(m.bind).toHaveBeenCalledTimes(1);});
});

it('rejects another customer location before OAuth or discovery',async()=>{m.sql.mockResolvedValue([]);expect((await POST(req({action:'connect'}))).status).toBe(404);expect(m.begin).not.toHaveBeenCalled();expect(m.client).not.toHaveBeenCalled();});
it('does not inherit the customer-wide Google connection for a new location',async()=>{await GET(new Request('https://taprater.com/api/account/google-business?businessId='+businessId));expect(m.summary).toHaveBeenCalledWith(scoped);expect(m.summary).not.toHaveBeenCalledWith(identity.owner);});
it('keeps legacy connected locations using their existing authorization for discovery',async()=>{m.sql.mockResolvedValue([{id:businessId,connection_owner:identity.owner}]);await GET(new Request('https://taprater.com/api/account/google-business?businessId='+businessId));expect(m.summary).toHaveBeenCalledWith(identity.owner);});
