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
 it('cannot finish a partial or failed review import',async()=>{for(const patch of [{next_page:'page2'},{last_error:'quota'}]){m.sql.mockResolvedValue([{...ready,...patch}]);expect((await POST(request('finish'))).status).toBe(400);}});
 it('imports reviews without requiring profile APIs',async()=>{m.sql.mockResolvedValue([{...ready,synced_at:null,profile_synced:null}]);expect((await POST(request('import'))).status).toBe(200);expect(m.profile).not.toHaveBeenCalled();expect(m.sync).toHaveBeenCalledWith({kind:'customer',email:'buyer@example.test'},'123');});
 it('rejects injected business ids',async()=>{const r=new Request('https://taprater.com/api/account/onboarding',{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify({action:'finish',businessId:'another-client'})});expect((await POST(r)).status).toBe(400);expect(m.sql).not.toHaveBeenCalled();});
 it('finishes only the authenticated account after a complete import',async()=>{expect((await POST(request('finish'))).status).toBe(200);const update=m.sql.mock.calls.find(c=>c[0].join('').includes('SET marketing_onboarding_completed_at'));expect(update).toContain('buyer@example.test');expect(m.sync).not.toHaveBeenCalled();});
});

it('finishes a complete review import even without a profile snapshot',async()=>{m.sql.mockResolvedValue([{...ready,profile_synced:null}]);expect((await POST(request('finish'))).status).toBe(200);expect(m.profile).not.toHaveBeenCalled();});

const existingId='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const existingRequest=(body:unknown={action:'chooseExisting',businessId:existingId})=>new Request('https://taprater.com/api/account/onboarding',{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify(body)});
describe('existing stand owner onboarding',()=>{
 it('lists only active account-owned locations before setup starts',async()=>{
  m.sql.mockResolvedValueOnce([{business_id:null,completed:null}]).mockResolvedValueOnce([{id:existingId,business_name:'Existing stand business'}]);
  const response=await GET(new Request('https://taprater.com/api/account/onboarding'));
  expect(await response.json()).toMatchObject({businesses:[{id:existingId}]});
  const [query,...values]=m.sql.mock.calls[1];
  expect(query.join('?')).toContain('c.id=b.customer_id');expect(query.join('?')).toContain("c.account_status='active'");expect(query.join('?')).toContain("b.status IS DISTINCT FROM 'marketing_removed'");expect(values).toEqual(['buyer@example.test']);
 });
 it('reuses an owned location through the existing license allocator without creating hardware or another business',async()=>{
  m.sql.mockResolvedValueOnce([{id:existingId}]).mockResolvedValueOnce([{...ready,business_id:existingId}]);
  const response=await POST(existingRequest());expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({business_id:existingId});
  const [query,...values]=m.sql.mock.calls[0],statement=query.join('?');
  expect(values).toEqual(['buyer@example.test',existingId]);
  expect(statement).toContain('FOR UPDATE');expect(statement).toContain('b JOIN account c ON c.id=b.customer_id');
  expect(statement).toContain('claim_marketing_location(id,customer_id)');expect(statement).toContain('c.marketing_onboarding_business_id=b.id');
  expect(statement).not.toContain('create_marketing_business');expect(statement).not.toContain('INSERT INTO businesses');
  expect(m.sync).not.toHaveBeenCalled();expect(m.profile).not.toHaveBeenCalled();
 });
 it('does not advance onboarding when the tenant-owned licensed selection returns no match',async()=>{
  m.sql.mockResolvedValueOnce([]);const response=await POST(existingRequest());expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({error:expect.stringContaining('from your account')});expect(m.sql).toHaveBeenCalledTimes(1);expect(m.sync).not.toHaveBeenCalled();
 });
 it.each([{action:'chooseExisting',businessId:existingId,email:'other@example.test'},{action:'chooseExisting',businessId:'not-a-uuid'}])('rejects injected identity or invalid selection before storage',async body=>{
  expect((await POST(existingRequest(body))).status).toBe(400);expect(m.sql).not.toHaveBeenCalled();
 });
});

it('switches on default review alerts for the finishing account without overwriting saved settings',async()=>{
 const r=new Request('https://taprater.com/api/account/onboarding',{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify({action:'finish',zone:'America/Chicago'})});
 expect((await POST(r)).status).toBe(200);
 const insert=m.sql.mock.calls.find(c=>c[0].join('').includes('INSERT INTO review_email_preferences'));
 expect(insert).toBeDefined();expect(insert![0].join('')).toContain('ON CONFLICT(business_id) DO NOTHING');
 expect(insert).toEqual(expect.arrayContaining(['immediate','off',true,false,'America/Chicago',9,'buyer@example.test']));
});
it('still finishes setup if default alerts cannot be saved',async()=>{
 m.sql.mockImplementation(async(strings:TemplateStringsArray)=>{if(strings.join('').includes('INSERT INTO review_email_preferences'))throw Error('db down');return [ready];});
 expect((await POST(request('finish'))).status).toBe(200);
});
