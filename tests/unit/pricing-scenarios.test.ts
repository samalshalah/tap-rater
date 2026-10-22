import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),sql:vi.fn()}));
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:mocks.auth}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
import {GET,POST} from '@/app/api/admin/pricing-scenarios/route';
import {scenarioInput,scenarioVersion} from '@/lib/pricing-scenarios';
import {defaultPlanInputs} from '@/lib/usage-plan-model';
const payload=()=>({id:'a135fcbf-06a3-4d7f-8864-ef6b2c9f8c16',name:'Launch baseline',modelVersion:scenarioVersion,plans:defaultPlanInputs});
const request=(data:unknown,origin='https://taprater.com')=>new Request('https://taprater.com/api/admin/pricing-scenarios',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(null);});
describe('private saved scenarios',()=>{
 it('denies unauthenticated reads and writes without touching storage',async()=>{
  mocks.auth.mockResolvedValue(new Response(null,{status:401}));
  expect((await GET()).status).toBe(401);expect((await POST(request(payload()))).status).toBe(401);expect(mocks.sql).not.toHaveBeenCalled();
 });
 it('blocks cross-origin writes',async()=>{expect((await POST(request(payload(),'https://other.test'))).status).toBe(403);expect(mocks.sql).not.toHaveBeenCalled();});
 it('rejects client data, malformed assumptions and unsupported versions',()=>{
  expect(scenarioInput.safeParse({...payload(),customerId:'private'}).success).toBe(false);
  expect(scenarioInput.safeParse({...payload(),modelVersion:'future'}).success).toBe(false);
  expect(scenarioInput.safeParse({...payload(),plans:[{...defaultPlanInputs[0],support:-1},...defaultPlanInputs.slice(1)]}).success).toBe(false);
  expect(scenarioInput.safeParse({...payload(),plans:[{...defaultPlanInputs[0],review:'private'},...defaultPlanInputs.slice(1)]}).success).toBe(false);
 });
 it('inserts snapshots without updating pricing or client tables',async()=>{
  mocks.sql.mockResolvedValue([{id:payload().id}]);expect((await POST(request(payload()))).status).toBe(201);
  const query=mocks.sql.mock.calls[0][0].join('');expect(query).toContain('ON CONFLICT(id) DO NOTHING');expect(query).not.toContain('UPDATE');
 });
 it('handles exact retries idempotently and rejects conflicting retries',async()=>{
  mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{id:payload().id}]);expect((await POST(request(payload()))).status).toBe(200);
  mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);expect((await POST(request(payload()))).status).toBe(409);
 });
 it('returns storage errors without details and disables caching',async()=>{
  mocks.sql.mockRejectedValue(new Error('private database detail'));const r=await GET();expect(r.status).toBe(503);expect(r.headers.get('Cache-Control')).toContain('no-store');expect(await r.text()).not.toContain('private database detail');
 });
});
