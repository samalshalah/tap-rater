import {describe,it,expect,vi,afterEach} from 'vitest';
import {authorizedLink,isAutomaticCandidate,publishLiveReply,reconcileLiveReply,syncLiveReviews,suggestLiveReply,saveLiveSettings,bindGoogleLocation,stopLiveReviews} from '@/lib/google-business/live-reviews';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const data={reviewId:'r1',starRating:'FIVE' as const,comment:'Lovely dress',createTime:'2026-10-20T12:00:00Z',updateTime:'2026-10-20T12:00:00Z'};
const review={id,business_id:id,resource:'accounts/a/locations/l/reviews/r1',data,draft:'Thank you for visiting!',version:2,publish_state:'idle'};
const link={business_id:id,owner:'admin@example.com',business_name:'Norah',parent:'accounts/a/locations/l',enabled:true,auto_enabled:true,ai_consent:true,auto_four:false,auto_five:true,settings_version:1,consent_at:'2026-10-20T10:00:00Z'};
const sqlRows=(...rows:unknown[])=>{const sql=vi.fn();for(const r of rows)sql.mockResolvedValueOnce(r);return sql as any;};
const client=()=>({getReview:vi.fn().mockResolvedValue(data),publishReply:vi.fn().mockResolvedValue({comment:review.draft}),listReviews:vi.fn().mockResolvedValue({reviews:[data],nextPageToken:'next'}),listLocations:vi.fn(),listAccounts:vi.fn()});
afterEach(()=>vi.unstubAllEnvs());
describe('live Google review safety',()=>{
 it('binds authorization to active customer ownership and the same Google identity',async()=>{
  const sql=sqlRows([]);await expect(authorizedLink({kind:'customer',email:'other@example.com'},id,sql)).rejects.toMatchObject({status:404});
  const query=sql.mock.calls[0][0].join('?');expect(query).toContain('b.customer_id=l.customer_id');expect(query).toContain('g.google_subject=l.google_subject');expect(query).toContain("c.account_status='active'");expect(sql.mock.calls[0]).toContain('other@example.com');
 });
 it('keeps publishing locked before activation without touching credentials or storage',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','false');const sql=vi.fn(),factory=vi.fn();
  await expect(publishLiveReply({kind:'admin'},id,2,false,sql as any,factory)).rejects.toThrow('locked');expect(sql).not.toHaveBeenCalled();expect(factory).not.toHaveBeenCalled();
 });
 it('refuses sample IDs and unavailable reviews before calling Google',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');const factory=vi.fn();await expect(publishLiveReply({kind:'admin'},id,2,false,sqlRows([]),factory)).rejects.toMatchObject({status:404});expect(factory).not.toHaveBeenCalled();
 });
 it('does not replace a reply changed directly on Google',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');const google=client();google.getReview.mockResolvedValue({...data,reviewReply:{comment:'Owner replied elsewhere'}} as any);
  await expect(publishLiveReply({kind:'admin'},id,2,false,sqlRows([review],[link]),async()=>google)).rejects.toThrow('changed on Google');expect(google.publishReply).not.toHaveBeenCalled();
 });
 it('does not publish after a concurrent draft or permission change wins the claim',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');const google=client(),sql=sqlRows([review],[link],[]);
  await expect(publishLiveReply({kind:'admin'},id,2,false,sql,async()=>google)).rejects.toThrow('already underway');expect(google.publishReply).not.toHaveBeenCalled();
  const query=sql.mock.calls[2][0].join('?');expect(query).toContain('r.version=');expect(query).toContain('l.enabled');expect(query).toContain('g.google_subject=l.google_subject');
 });
 it('records an uncertain outcome on timeout and never retries the write',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');const google=client();google.publishReply.mockRejectedValue(new Error('timeout'));const sql=sqlRows([review],[link],[{id}],[]);
  await expect(publishLiveReply({kind:'admin'},id,2,false,sql,async()=>google)).rejects.toThrow('No automatic retry');expect(google.publishReply).toHaveBeenCalledTimes(1);expect(sql.mock.calls[3][0].join('?')).toContain("publish_state='uncertain'");
 });
 it('publishes exactly the saved text and persists confirmation',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');const google=client(),sql=sqlRows([review],[link],[{id}],[]);
  expect(await publishLiveReply({kind:'admin'},id,2,false,sql,async()=>google)).toEqual({published:true});expect(google.publishReply).toHaveBeenCalledWith(review.resource,review.draft);expect(sql.mock.calls[3][0].join('?')).toContain("publish_state='published'");
 });
 it('reconciles a timed-out publish using a read only',async()=>{
  const google=client();google.getReview.mockResolvedValue({...data,reviewReply:{comment:review.draft}} as any);
  const sql=sqlRows([{...review,publish_state:'uncertain',attempted_reply:review.draft,attempted_at:new Date(Date.now()-120000).toISOString(),attempt_id:id}],[link],[]);
  expect(await reconcileLiveReply({kind:'admin'},id,sql,async()=>google)).toEqual({resolved:true,published:true});expect(google.publishReply).not.toHaveBeenCalled();
 });
 it('syncs a page without overwriting local drafts or deleting unseen later pages',async()=>{
  const google=client(),sql=sqlRows([link],[{id}],[],[],[]);expect(await syncLiveReviews({kind:'admin'},id,sql,async()=>google)).toEqual({imported:1,more:true});
  expect(google.listReviews).toHaveBeenCalledWith(link.parent,undefined);const upsert=sql.mock.calls[2][0].join('?');expect(upsert).not.toContain('draft=');expect(upsert).toContain("NOT IN ('publishing','uncertain')");expect(sql.mock.calls.some((c:any)=>c[0].join('?').includes('DELETE FROM'))).toBe(false);
 });
 it('rejects mismatched resource paths returned by Google',async()=>{
  const google=client();google.listReviews.mockResolvedValue({reviews:[{...data,name:'accounts/other/locations/other/reviews/r1'}]} as any);const sql=sqlRows([link],[{id}],[],[]);
  await expect(syncLiveReviews({kind:'admin'},id,sql,async()=>google)).rejects.toThrow('different location');expect(sql.mock.calls.some((c:any)=>c[0].join('?').includes('INSERT INTO'))).toBe(false);
 });
 it('requires AI consent and quota before transmitting real reviews',async()=>{
  const generate=vi.fn();await expect(suggestLiveReply({kind:'admin'},id,sqlRows([review],[link],[]),generate)).rejects.toMatchObject({status:429});expect(generate).not.toHaveBeenCalled();
 });
 it('only auto-posts new selected positive reviews without drafts or existing replies',()=>{
  expect(isAutomaticCandidate(data,'',link)).toBe(true);for(const starRating of ['ONE','TWO','THREE','FOUR'])expect(isAutomaticCandidate({...data,starRating:starRating as any},'',link)).toBe(false);
  expect(isAutomaticCandidate(data,'human draft',link)).toBe(false);expect(isAutomaticCandidate({...data,reviewReply:{comment:'Existing'}},'',link)).toBe(false);expect(isAutomaticCandidate({...data,createTime:'2026-10-19T12:00:00Z'},'',link)).toBe(false);
 });
 it('requires explicit live automatic consent and activation',async()=>{
  vi.stubEnv('GOOGLE_REVIEWS_PUBLISHING_ENABLED','true');await expect(saveLiveSettings({kind:'admin'},{businessId:id,aiConsent:true,autoEnabled:true,four:false,five:true,style:'friendly',version:1,confirmAutomaticPosting:false},sqlRows([link]))).rejects.toThrow('expressly confirmed');
 });
 it('does not assign a Google location until an actual review read succeeds',async()=>{
  const google=client();google.listLocations.mockResolvedValue({locations:[{name:'locations/l',title:'Norah'}]});google.listReviews.mockRejectedValue(new Error('quota zero'));const sql=sqlRows([{customer_id:id}],[{google_subject:'subject'}]);
  await expect(bindGoogleLocation('admin@example.com',id,'accounts/a','locations/l',sql,async()=>google)).rejects.toThrow('quota zero');expect(sql).toHaveBeenCalledTimes(2);
 });
 it('can stop local access even when the Google connection is missing',async()=>{
  const sql=sqlRows([{business_id:id}]);expect(await stopLiveReviews({kind:'customer',email:'owner@example.com'},id,sql)).toEqual({stopped:true});expect(sql.mock.calls[0][0].join('?')).not.toContain('google_business_connections');
 });
});
