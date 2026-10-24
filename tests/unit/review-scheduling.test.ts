import {describe,it,expect,vi} from 'vitest';
import {scheduledReplyEligible,liveSettingsSchema,olderReviews,runLiveReviewMaintenance} from '@/lib/google-business/live-reviews';
const now=Date.parse('2026-10-24T14:00:00Z');
const link={enabled:true,auto_enabled:true,ai_consent:true,auto_four:true,auto_five:true,consent_at:'2026-10-24T10:00:00Z'};
const review={data:{starRating:'FIVE',createTime:'2026-10-24T11:00:00Z'},version:2,scheduled_version:2,scheduled_at:'2026-10-24T14:00:00Z',schedule_consent_at:link.consent_at};
describe('delayed review safety',()=>{
 it.each(['ONE','TWO','THREE'])('never automatically publishes %s including explicitly queued older reviews',starRating=>{expect(scheduledReplyEligible({...review,data:{...review.data,starRating},old_reply_requested_at:'2026-10-24'},link,now)).toBe(false);});
 it.each(['FOUR','FIVE'])('waits until due for %s',starRating=>{const r={...review,data:{...review.data,starRating}};expect(scheduledReplyEligible(r,link,now-1)).toBe(false);expect(scheduledReplyEligible(r,link,now)).toBe(true);});
 it('rejects disabled autopilot, changed consent, edited drafts, spam, or existing replies',()=>{
  for(const change of [{auto_enabled:false},{ai_consent:false},{enabled:false},{consent_at:'2026-10-24T12:00:00Z'}])expect(scheduledReplyEligible(review,{...link,...change},now)).toBe(false);
  for(const change of [{version:3},{suspected_spam:true},{scheduled_at:null},{data:{...review.data,reviewReply:{comment:'Owner replied'}}}])expect(scheduledReplyEligible({...review,...change},link,now)).toBe(false);
 });
 it('requires explicit older-review selection for historical positives',()=>{const old={...review,data:{...review.data,createTime:'2025-01-01'}};expect(scheduledReplyEligible(old,link,now)).toBe(false);expect(scheduledReplyEligible({...old,old_reply_requested_at:'2026-10-24'},link,now)).toBe(true);});
 it('validates delay choices',()=>{const input={businessId:'9fb3ee3b-0920-4db5-a03d-7245987a8751',aiConsent:true,autoEnabled:false,four:true,five:true,style:'friendly',version:1,confirmAutomaticPosting:false};for(const delayMinutes of [60,120,360,1440])expect(liveSettingsSchema.safeParse({...input,delayMinutes}).success).toBe(true);expect(liveSettingsSchema.safeParse({...input,delayMinutes:0}).success).toBe(false);});
 it('older-review preview is read only and scoped to the authorized location',async()=>{const sql=vi.fn().mockResolvedValueOnce([{...link,reply_delay_minutes:120}]).mockResolvedValueOnce(['ONE','THREE','FOUR','FIVE'].map(starRating=>({data:{starRating}})));expect(await olderReviews({kind:'customer',email:'owner@example.test'},'location',false,sql as any)).toMatchObject({total:4,scheduled:2,drafts:2,queued:false});expect(sql).toHaveBeenCalledTimes(2);expect(sql.mock.calls[1]).toContain('location');});
 it('does no work when another worker holds the lease',async()=>{const sql=vi.fn().mockResolvedValue([]),google=vi.fn(),ai=vi.fn();expect(await runLiveReviewMaintenance(sql as any,google,ai)).toMatchObject({busy:true});expect(google).not.toHaveBeenCalled();expect(ai).not.toHaveBeenCalled();});
 it('keeps 1000 independent eligibility decisions isolated',()=>{for(let i=0;i<1000;i++)expect(scheduledReplyEligible({...review,version:i,scheduled_version:i},{...link,auto_enabled:i%2===0},now)).toBe(i%2===0);});
});
