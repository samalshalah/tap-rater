import {describe,it,expect,vi,afterEach} from 'vitest';
import {prepareAutomaticDraft,runLiveReviewMaintenance} from '@/lib/google-business/live-reviews';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const link={business_id:id,customer_id:id,owner:'customer:client@example.com',google_subject:'s',business_name:'Example',parent:'accounts/a/locations/l',enabled:true,ai_consent:true,auto_style:'friendly',settings_version:1};
const review={id,version:1,data:{reviewId:'r',starRating:'ONE',comment:'Disappointing visit'}};
const suggestions={friendly:'Thank you for sharing your feedback.',professional:'Thank you for your feedback.',personal:'We appreciate your feedback.',short:'Thank you for letting us know.'};
const rows=(...r:unknown[])=>{const q=vi.fn();r.forEach(v=>q.mockResolvedValueOnce(v));return q as any;};
afterEach(()=>vi.unstubAllEnvs());
describe('automatic draft processing',()=>{
 it('requires per-location AI permission',async()=>{const generate=vi.fn();expect(await prepareAutomaticDraft(id,rows([{...link,ai_consent:false}]),generate)).toEqual({drafted:false});expect(generate).not.toHaveBeenCalled();});
 it('processes negative reviews but saves only unapproved drafts',async()=>{const sql=rows([link],[review],[{id}],[{allowed:true}],[{id}],[]);const generate=vi.fn().mockResolvedValue(suggestions);expect(await prepareAutomaticDraft(id,sql,generate)).toEqual({drafted:true});expect(generate).toHaveBeenCalledWith('Example',1,'Disappointing visit',undefined,{businessId:id,customerId:id,service:'review_automatic'});const query=sql.mock.calls[4][0].join('?');expect(query).toContain('approved_version=NULL');expect(query).toContain("r.draft=''");expect(query).toContain('r.version=');expect(query).toContain('b.customer_id=l.customer_id');expect(query).toContain('g.google_subject=l.google_subject');});
 it('records a quiet draft check without calling AI or clearing retry errors',async()=>{const generate=vi.fn(),sql=rows([link],[],[]);expect(await prepareAutomaticDraft(id,sql,generate)).toEqual({drafted:false});expect(generate).not.toHaveBeenCalled();const query=sql.mock.calls[2][0].join('?');expect(query).toContain('draft_checked_at=now()');expect(query).toContain('settings_version=');expect(query).not.toContain('draft_error=NULL');expect(sql.mock.calls[2]).toContain(id);});
 it('does not overwrite a human edit or approval made during generation',async()=>{expect(await prepareAutomaticDraft(id,rows([link],[review],[{id}],[{allowed:true}],[],[]),vi.fn().mockResolvedValue(suggestions))).toEqual({drafted:false});});
 it('records a retryable failure without saving or publishing',async()=>{const sql=rows([link],[review],[{id}],[{allowed:true}],[]);expect(await prepareAutomaticDraft(id,sql,vi.fn().mockRejectedValue(new Error('provider unavailable')))).toEqual({drafted:false});expect(sql.mock.calls[4][0].join('?')).toContain('draft_error=');});
 it('never publishes from scheduled work even when the publishing flag is true',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');
  const sql=vi.fn(async(strings:TemplateStringsArray)=>{const q=strings.join('?');if(q.includes('SELECT l.business_id FROM'))return [{business_id:id}];if(q.includes('SELECT l.*'))return [link];if(q.includes('SET sync_lock='))return [{business_id:id}];if(q.includes('SET auto_attempt_at='))return [review];if(q.includes('reserve_marketing_units'))return [{allowed:true}];if(q.includes('SET ai_day='))return [{business_id:id}];if(q.includes('draft_generated_at=now()'))return [{id}];return [];});
  const publishReply=vi.fn();const client={listReviews:vi.fn().mockResolvedValue({reviews:[]}),publishReply};
  expect(await runLiveReviewMaintenance(sql as any,async()=>client as any,vi.fn().mockResolvedValue(suggestions))).toEqual({synced:1,drafted:1,published:0});expect(publishReply).not.toHaveBeenCalled();
 });
});
