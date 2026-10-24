import {describe,it,expect,vi} from 'vitest';
import {workerState,locationHealth} from '@/lib/admin-worker-health';
import {observeWorker,workerMetrics} from '@/lib/worker-observation';
describe('worker health',()=>{
 it('distinguishes eligible drafting from disabled autopilot',()=>{
  const state=locationHealth({enabled:true,connected:true,licensed:true,ai_consent:true,auto_enabled:false,synced_at:new Date(),draft_checked_at:new Date()});
  expect(state.importEligible).toBe(true);expect(state.draftEligible).toBe(true);
  expect(state.publishEligible).toBe(false);expect(state.publishEligibility).toBe('Autopilot off');
  expect(state.status).toBe('Reporting');
 });
 it('shows expired access rather than misleading worker overdue errors',()=>{
  const state=locationHealth({enabled:true,connected:true,licensed:false,licence_expires_at:'2020-01-01',synced_at:'2020-01-01',draft_error:true,ai_consent:true});
  expect(state.reasons).toEqual(['Licence expired']);expect(state.importEligible).toBe(false);
  expect(state.draftEligibility).toBe('Licence expired');
 });
 it('requires active account, AI permission, autopilot and selected ratings for publishing',()=>{
  const base={account_status:'active',enabled:true,connected:true,licensed:true,ai_consent:true,auto_enabled:true,auto_five:true};
  expect(locationHealth(base).publishEligible).toBe(true);
  for(const override of [{account_status:'pending_activation'},{ai_consent:false},{licensed:false},{connected:false},{auto_five:false}])expect(locationHealth({...base,...override}).publishEligible).toBe(false);
 });
 it('never calls unobserved or stale workers healthy',()=>{
  expect(workerState(undefined,1)).toBe('Not observed');
  expect(workerState({status:'success',started_at:'2020-01-01'},1)).toBe('Overdue');
  expect(workerState({status:'failed',started_at:new Date()},1)).toBe('Failed');
 });
 it('reports account blockers and keeps disabled integrations neutral',()=>{
  expect(locationHealth({enabled:false}).status).toBe('Not connected');
  const state=locationHealth({enabled:true,connected:false,licensed:false,uncertain:1});
  expect(state.status).toBe('Needs attention');expect(state.reasons).toContain('Google reconnect needed');expect(state.reasons).toContain('Service access blocked');
 });
 it('only stores allowlisted counters, never provider payloads or secrets',()=>{
  expect(workerMetrics({synced:2,published:1,token:'secret',reviews:['private'],status:'secret'})).toEqual({synced:2,published:1});
 });
 it('records success with run ownership and executes once',async()=>{
  const sql=vi.fn().mockResolvedValue([]),work=vi.fn().mockResolvedValue({drafted:2});
  expect(await observeWorker('reviews',work,sql as any)).toEqual({drafted:2});
  expect(work).toHaveBeenCalledTimes(1);expect(sql.mock.calls[1][0].join('?')).toContain('AND run_id=');
 });
 it('records failure without swallowing the job error',async()=>{
  const sql=vi.fn().mockResolvedValue([]);
  await expect(observeWorker('reviews',async()=>{throw Error('fixture');},sql as any)).rejects.toThrow('fixture');
  expect(sql.mock.calls[1][0].join('?')).toContain("status='failed'");
 });
 it('still runs work when telemetry storage fails',async()=>{
  const log=vi.spyOn(console,'warn').mockImplementation(()=>{}),work=vi.fn().mockResolvedValue({});
  await observeWorker('reviews',work,vi.fn().mockRejectedValue(Error('db')) as any);
  expect(work).toHaveBeenCalledTimes(1);log.mockRestore();
 });
});
