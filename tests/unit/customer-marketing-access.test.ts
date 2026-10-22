import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({sql:vi.fn(),auth:vi.fn()}));
vi.mock('@neondatabase/serverless',()=>({neon:()=>m.sql}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:m.auth}));
import {marketingAccessAllowed,withMarketingAccess} from '@/lib/customer-marketing-access';
beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({response:null,session:{email:'client@example.test'}});m.sql.mockResolvedValue([]);});
describe('Reviews package access',()=>{
 it('denies absent, inactive, expired and invalid grants',()=>{for(const access of [undefined,{status:'inactive',expires_at:null},{status:'active',expires_at:'2000-01-01'},{status:'testing',expires_at:'invalid'}])expect(marketingAccessAllowed(access)).toBe(false);});
 it('allows active and explicitly assigned testing access',()=>{for(const status of ['active','testing'])expect(marketingAccessAllowed({status,expires_at:null})).toBe(true);});
 it('blocks stand-only customers before a marketing handler runs',async()=>{const handler=vi.fn();const r=await withMarketingAccess(new Request('https://taprater.com'),handler);expect(r.status).toBe(403);expect((await r.json()).code).toBe('REVIEWS_PACKAGE_REQUIRED');expect(handler).not.toHaveBeenCalled();expect(m.sql.mock.calls[0]).toContain('client@example.test');});
 it('fails closed on a database outage',async()=>{m.sql.mockRejectedValue(new Error('private connection string'));const handler=vi.fn();const r=await withMarketingAccess(new Request('https://taprater.com'),handler);expect(r.status).toBe(503);expect(await r.text()).not.toContain('private');expect(handler).not.toHaveBeenCalled();});
 it('does not query access for anonymous requests',async()=>{m.auth.mockResolvedValue({response:new Response(null,{status:401}),session:null});const handler=vi.fn();expect((await withMarketingAccess(new Request('https://taprater.com'),handler)).status).toBe(401);expect(m.sql).not.toHaveBeenCalled();expect(handler).not.toHaveBeenCalled();});
 it('allows paid and testing accounts through to existing tenant checks',async()=>{for(const status of ['active','testing']){m.sql.mockResolvedValue([{status,expires_at:null}]);const handler=vi.fn().mockResolvedValue(new Response('own location'));expect(await (await withMarketingAccess(new Request('https://taprater.com'),handler)).text()).toBe('own location');expect(handler).toHaveBeenCalledTimes(1);}});
});

describe('all customer marketing endpoints',()=>{
 it('blocks every read and mutation without package access',async()=>{
  const routes=await Promise.all([
   import('@/app/api/account/local/route'),import('@/app/api/account/local/google/route'),import('@/app/api/account/local/heatmap/route'),import('@/app/api/account/local/issues/route'),import('@/app/api/account/reviews/route'),import('@/app/api/account/reviews/ai/route'),import('@/app/api/account/reviews/live/route'),import('@/app/api/account/google-business/route')
  ]);
  for(const route of routes)for(const [method,handler] of Object.entries(route)){
   const response=await handler(new Request('https://taprater.com/api/account/local',{method}));
   expect(response.status).toBe(403);expect(await response.json()).toMatchObject({code:'REVIEWS_PACKAGE_REQUIRED'});
  }
 });
});
