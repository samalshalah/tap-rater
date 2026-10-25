import {afterEach,describe,it,expect,vi} from 'vitest';
import {importReviewPages} from '@/lib/google-business/import-pages';
import {bindGoogleLocation,approveLiveDraft,publishLiveReply,saveLiveSettings} from '@/lib/google-business/live-reviews';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const actor={kind:'customer' as const,email:'client@example.com'};
const rows=(...values:unknown[][])=>{const sql=vi.fn();values.forEach(v=>sql.mockResolvedValueOnce(v));return sql as any;};
afterEach(()=>vi.unstubAllEnvs());
describe('client connection and authorized publishing',()=>{
 it('automatically exhausts every page sequentially',async()=>{
 const page=vi.fn().mockResolvedValueOnce({imported:50,more:true}).mockResolvedValueOnce({imported:50,more:true}).mockResolvedValueOnce({imported:3,more:false});const progress=vi.fn(),wait=vi.fn().mockResolvedValue(undefined);
 await importReviewPages(page,progress,wait);expect(page).toHaveBeenCalledTimes(3);expect(wait).toHaveBeenCalledTimes(2);expect(progress).toHaveBeenLastCalledWith(103);
 });
 it('stops on an error without restarting the import or claiming completion',async()=>{const page=vi.fn().mockRejectedValue(new Error('quota'));await expect(importReviewPages(page,vi.fn(),vi.fn())).rejects.toThrow('quota');expect(page).toHaveBeenCalledTimes(1);});
 it('stops fetching after the component is unmounted',async()=>{const page=vi.fn();await importReviewPages(page,vi.fn(),vi.fn(),()=>true);expect(page).not.toHaveBeenCalled();});
 it('filters binding by the authenticated customer before any Google calls',async()=>{
 const sql=rows([],[{google_subject:'s'}]),factory=vi.fn();await expect(bindGoogleLocation('customer:client@example.com',id,'accounts/a','locations/l',sql,factory,'client@example.com')).rejects.toThrow('active customer');expect(sql.mock.calls[0]).toContain('client@example.com');expect(sql.mock.calls[0][0].join('?')).toContain('lower(c.email)');expect(factory).not.toHaveBeenCalled();
 });
 it('keeps client publication locked when deployment publishing is disabled',async()=>{
 vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','false');const sql=rows(),factory=vi.fn();
 await expect(publishLiveReply(actor,id,2,false,sql,factory)).rejects.toThrow('locked');
 expect(sql).not.toHaveBeenCalled();expect(factory).not.toHaveBeenCalled();
 });
 it('publishes the exact saved client draft through a fake Google client when enabled',async()=>{
 vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');
 const data={starRating:'FIVE',comment:'Great',updateTime:'2026-10-01T00:00:00Z'};
 const sql=rows([{id,business_id:id,version:2,draft:'Thanks',resource:'accounts/a/locations/l/reviews/r',data}],[{owner:'customer:client@example.com',enabled:true}],[{id}],[]);
 const client={getReview:vi.fn().mockResolvedValue(data),publishReply:vi.fn().mockResolvedValue({comment:'Thanks'})};
 const factory=vi.fn().mockResolvedValue(client);
 expect(await publishLiveReply(actor,id,2,false,sql,factory)).toEqual({published:true});
 expect(factory).toHaveBeenCalledWith('customer:client@example.com');
 expect(client.publishReply).toHaveBeenCalledWith('accounts/a/locations/l/reviews/r','Thanks');
 expect(sql.mock.calls[2][0].join('?')).toContain('lower(c.email)');
 expect(sql.mock.calls[2]).toContain(actor.email);
 });
 it('records approval of the exact saved version without calling Google',async()=>{
 const sql=rows([{id,business_id:id}],[{enabled:true}],[{approved_version:3}]);expect(await approveLiveDraft(actor,id,3,sql)).toEqual({approved:true});expect(sql.mock.calls[2][0].join('?')).toContain('approved_version=version');expect(sql.mock.calls[2]).toContain(3);
 });
 it('rejects stale approval',async()=>{await expect(approveLiveDraft(actor,id,2,rows([{id,business_id:id}],[{enabled:true}],[]))).rejects.toThrow('latest draft');});
 it('rejects automatic posting without explicit client confirmation',async()=>{
 vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');
 const sql=rows([{enabled:true,owner:'customer:client@example.com'}]);
 await expect(saveLiveSettings(actor,{businessId:id,aiConsent:true,autoEnabled:true,four:false,five:true,style:'friendly',version:1,confirmAutomaticPosting:false},sql)).rejects.toThrow('expressly confirmed');
 expect(sql).toHaveBeenCalledTimes(1);
 });
 it('saves confirmed client autopilot settings and invalidates stale queued replies',async()=>{
 vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');
 const sql=rows([{enabled:true,owner:'customer:client@example.com',customer_id:id,parent:'accounts/a/locations/l',google_subject:'s'}],[{settings_version:2}],[]);
 expect(await saveLiveSettings(actor,{businessId:id,aiConsent:true,autoEnabled:true,four:false,five:true,style:'friendly',version:1,confirmAutomaticPosting:true},sql)).toEqual({settings_version:2});
 expect(sql.mock.calls[1][0].join('?')).toContain('settings_version=');
 expect(sql.mock.calls[2][0].join('?')).toContain('scheduled_at=NULL');
 });
});
