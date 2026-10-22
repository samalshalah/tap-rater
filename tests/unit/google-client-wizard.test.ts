import {describe,it,expect,vi} from 'vitest';
import {importReviewPages} from '@/lib/google-business/import-pages';
import {bindGoogleLocation,approveLiveDraft,publishLiveReply,saveLiveSettings} from '@/lib/google-business/live-reviews';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const actor={kind:'customer' as const,email:'client@example.com'};
const rows=(...values:unknown[][])=>{const sql=vi.fn();values.forEach(v=>sql.mockResolvedValueOnce(v));return sql as any;};
describe('client connection and draft-only import',()=>{
 it('automatically exhausts every page sequentially',async()=>{
 const page=vi.fn().mockResolvedValueOnce({imported:50,more:true}).mockResolvedValueOnce({imported:50,more:true}).mockResolvedValueOnce({imported:3,more:false});const progress=vi.fn(),wait=vi.fn().mockResolvedValue(undefined);
 await importReviewPages(page,progress,wait);expect(page).toHaveBeenCalledTimes(3);expect(wait).toHaveBeenCalledTimes(2);expect(progress).toHaveBeenLastCalledWith(103);
 });
 it('stops on an error without restarting the import or claiming completion',async()=>{const page=vi.fn().mockRejectedValue(new Error('quota'));await expect(importReviewPages(page,vi.fn(),vi.fn())).rejects.toThrow('quota');expect(page).toHaveBeenCalledTimes(1);});
 it('stops fetching after the component is unmounted',async()=>{const page=vi.fn();await importReviewPages(page,vi.fn(),vi.fn(),()=>true);expect(page).not.toHaveBeenCalled();});
 it('filters binding by the authenticated customer before any Google calls',async()=>{
 const sql=rows([],[{google_subject:'s'}]),factory=vi.fn();await expect(bindGoogleLocation('customer:client@example.com',id,'accounts/a','locations/l',sql,factory,'client@example.com')).rejects.toThrow('active customer');expect(sql.mock.calls[0]).toContain('client@example.com');expect(sql.mock.calls[0][0].join('?')).toContain('lower(c.email)');expect(factory).not.toHaveBeenCalled();
 });
 it('cannot publish a client-owned link even when deployment publishing is enabled',async()=>{
 vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');const sql=rows([{id,business_id:id,version:2,draft:'Thanks'}],[{owner:'customer:client@example.com',enabled:true}]),factory=vi.fn();await expect(publishLiveReply({kind:'admin'},id,2,false,sql,factory)).rejects.toThrow('draft-only');expect(factory).not.toHaveBeenCalled();vi.unstubAllEnvs();
 });
 it('records approval of the exact saved version without calling Google',async()=>{
 const sql=rows([{id,business_id:id}],[{enabled:true}],[{approved_version:3}]);expect(await approveLiveDraft(actor,id,3,sql)).toEqual({approved:true});expect(sql.mock.calls[2][0].join('?')).toContain('approved_version=version');expect(sql.mock.calls[2]).toContain(3);
 });
 it('rejects stale approval',async()=>{await expect(approveLiveDraft(actor,id,2,rows([{id,business_id:id}],[{enabled:true}],[]))).rejects.toThrow('latest draft');});
 it('rejects automatic posting for client connections',async()=>{const sql=rows([{enabled:true,owner:'customer:client@example.com'}]);await expect(saveLiveSettings(actor,{businessId:id,aiConsent:true,autoEnabled:true,four:false,five:true,style:'friendly',version:1,confirmAutomaticPosting:true},sql)).rejects.toThrow('draft-only');expect(sql).toHaveBeenCalledTimes(1);});
});
