import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({access:vi.fn(),snapshot:vi.fn()}));
vi.mock('@/lib/customer-marketing-access',()=>({getCustomerMarketingState:m.access}));
vi.mock('@/lib/local-management',()=>({localSnapshot:m.snapshot}));
import {getInitialDashboardSnapshot} from '@/lib/initial-dashboard-snapshot';
beforeEach(()=>{vi.resetAllMocks();m.access.mockResolvedValue({allowed:true,onboardingCompleted:true});});
it.each([{allowed:false,onboardingCompleted:true},{allowed:true,onboardingCompleted:false}])('does not read workspace before access and onboarding checks: %j',async access=>{
 m.access.mockResolvedValue(access);
 expect(await getInitialDashboardSnapshot('customer@example.test')).toBeNull();
 expect(m.snapshot).not.toHaveBeenCalled();
});
it('scopes every read to its customer and matches the API date representation',async()=>{
 m.snapshot.mockImplementation(async actor=>({locations:[{id:actor.email,synced_at:new Date('2026-10-01T00:00:00Z')}],listings:[],customers:[],licenses:null}));
 const [a,b]=await Promise.all([getInitialDashboardSnapshot('a@example.test'),getInitialDashboardSnapshot('b@example.test')]);
 expect(a?.locations[0]).toEqual({id:'a@example.test',synced_at:'2026-10-01T00:00:00.000Z'});
 expect(b?.locations[0].id).toBe('b@example.test');
 expect(m.snapshot).toHaveBeenCalledWith({kind:'customer',email:'a@example.test'});
 expect(m.snapshot).toHaveBeenCalledTimes(2);
});
it('falls back to client loading when access or workspace reads fail',async()=>{
 m.access.mockRejectedValueOnce(new Error('unavailable'));
 expect(await getInitialDashboardSnapshot('a@example.test')).toBeNull();
 expect(m.snapshot).not.toHaveBeenCalled();
 m.snapshot.mockRejectedValueOnce(new Error('database unavailable'));
 expect(await getInitialDashboardSnapshot('a@example.test')).toBeNull();
});
