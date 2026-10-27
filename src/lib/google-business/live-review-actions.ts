import { randomUUID } from "node:crypto";
import { generateReviewSuggestions } from "../review-ai-provider";
import type { ReviewActor } from "../review-workspaces";
import { livePublishingEnabled, liveDb, LiveReviewError, actorEmail, reviewStars, clientFor, loadLiveReview, reserveAi, assertReviewNotSpam, scheduledReplyEligible } from "./live-review-core";

export async function saveLiveDraft(actor:ReviewActor,id:string,draft:string,version:number,sql=liveDb()){
 const {review}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 const rows=await sql`UPDATE google_live_reviews SET draft=${draft},version=version+1,publish_state='idle',auto_schedule_cancelled=true,scheduled_at=NULL,old_reply_requested_at=NULL WHERE id=${id} AND version=${version}
 AND NOT suspected_spam AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed or a publish is unresolved. Reload or check the publish result.');return rows[0];
}

export async function suggestLiveReply(actor:ReviewActor,id:string,sql=liveDb(),generate=generateReviewSuggestions){
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);await reserveAi(String(link.business_id),sql);
 return generate(String(link.business_name),reviewStars(review.data),review.data.comment || '',undefined,{businessId:String(link.business_id),customerId:String(link.customer_id),service:'review_manual'});
}

export async function publishLiveReply(actor:ReviewActor,id:string,version:number,automatic=false,sql=liveDb(),makeClient=clientFor){
 if(!livePublishingEnabled())throw new LiveReviewError('Live Google publishing is locked until API approval and the activation check are complete.');
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 if(Number(review.version)!==version || !String(review.draft).trim())throw new LiveReviewError('Save and review the latest draft before publishing.');
 if(automatic && (!link.auto_enabled || !link.ai_consent || !scheduledReplyEligible(review,link)))throw new LiveReviewError('Automatic posting is no longer eligible.');
 if(automatic&&review.old_reply_requested_at){
  const [budget]=await sql`SELECT count(*)::int AS used,min(attempted_at)+interval '1 hour' AS next_at FROM google_live_reviews WHERE business_id=${link.business_id} AND old_reply_requested_at IS NOT NULL AND attempted_at>now()-interval '1 hour' AND publish_state IN ('published','publishing','uncertain')`;
  if(Number(budget?.used)>=20){await sql`UPDATE google_live_reviews SET scheduled_at=${budget.next_at}::timestamptz+interval '1 second' WHERE id=${id} AND version=${version} AND publish_state='idle'`;return {published:false};}
 }
 const client=await makeClient(String(link.owner));
 // Refresh immediately before a write so we do not blindly overwrite changes made on Google.
 const current=await client.getReview(String(review.resource));
 if((current.reviewReply?.comment || '')!==(review.data.reviewReply?.comment || '') || current.updateTime!==review.data.updateTime)throw new LiveReviewError('The review or reply changed on Google. Sync and review it again.');
 if(automatic && !scheduledReplyEligible({...review,data:current},link))throw new LiveReviewError('This review now needs manual attention.');
 const attempt=randomUUID();
 const claimed=await sql`UPDATE google_live_reviews r SET publish_state='publishing',attempt_id=${attempt},attempted_reply=draft,attempted_at=now()
 FROM google_review_links l,businesses b,customers c,google_business_connections g
 WHERE r.id=${id} AND NOT r.suspected_spam AND r.version=${version} AND r.publish_state NOT IN ('publishing','uncertain') AND r.business_id=l.business_id AND l.enabled
 AND b.id=l.business_id AND b.customer_id=l.customer_id AND c.id=b.customer_id AND c.account_status='active' AND marketing_location_allowed(b.id)
 AND g.owner=l.owner AND g.google_subject=l.google_subject AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)})
 AND (${!automatic} OR (l.auto_enabled AND l.ai_consent AND l.settings_version=${link.settings_version} AND r.scheduled_at<=now() AND NOT r.auto_schedule_cancelled AND (r.old_reply_requested_at IS NULL OR (SELECT count(*) FROM google_live_reviews prior WHERE prior.business_id=r.business_id AND prior.old_reply_requested_at IS NOT NULL AND prior.attempted_at>now()-interval '1 hour' AND prior.publish_state IN ('published','publishing','uncertain'))<20) AND r.scheduled_version=r.version AND r.schedule_consent_at=l.consent_at)) RETURNING r.id`;
 if(!claimed.length)throw new LiveReviewError('Publishing is already underway or the workspace changed. Check the result before trying again.');
 try{
  const reply=await client.publishReply(String(review.resource),String(review.draft));
  if(reply.comment!==review.draft)throw new LiveReviewError('Google did not confirm the exact reply. Check the publishing result.');
  await sql`UPDATE google_live_reviews SET data=jsonb_set(data,'{reviewReply}',${JSON.stringify(reply)}::jsonb),publish_state='published',version=version+1,fetched_at=now(),scheduled_at=NULL WHERE id=${id} AND attempt_id=${attempt}`;
  return {published:true};
 }catch(error){
  await sql`UPDATE google_live_reviews SET publish_state='uncertain' WHERE id=${id} AND attempt_id=${attempt}`;
  throw new LiveReviewError('Publishing was not confirmed. Use Check publish result before taking another action. No automatic retry will be sent.');
 }
}

export async function reconcileLiveReply(actor:ReviewActor,id:string,sql=liveDb(),makeClient=clientFor){
 const {review,link}=await loadLiveReview(actor,id,sql);
 if(!['publishing','uncertain'].includes(review.publish_state))return {resolved:true};
 if(Date.now()-new Date(review.attempted_at).getTime()<60_000)throw new LiveReviewError('Wait one minute for the outstanding Google request to finish.');
 const current=await (await makeClient(String(link.owner))).getReview(String(review.resource));
 const matched=current.reviewReply?.comment===review.attempted_reply;
 // After five minutes, expose the authoritative result for explicit human review. Never retry automatically.
 const resolved=matched || Date.now()-new Date(review.attempted_at).getTime()>300_000;
 await sql`UPDATE google_live_reviews SET data=${JSON.stringify(current)}::jsonb,fetched_at=now(),publish_state=${matched?'published':resolved?'idle':'uncertain'},version=version+1
 WHERE id=${id} AND attempt_id=${review.attempt_id} AND publish_state IN ('publishing','uncertain')`;
 return {resolved,published:matched};
}

export async function approveLiveDraft(actor:ReviewActor,id:string,version:number,sql=liveDb()){
 const {review}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 const rows=await sql`UPDATE google_live_reviews SET approved_version=version WHERE id=${id} AND version=${version} AND draft<>'' AND NOT suspected_spam AND publish_state='idle' RETURNING approved_version`;
 if(!rows.length)throw new LiveReviewError('Save and review the latest draft before approving.');
 return {approved:true};
}

export async function flagLiveReview(actor:ReviewActor,id:string,spam:boolean,version:number,sql=liveDb()){
 await loadLiveReview(actor,id,sql);
 const rows=await sql`UPDATE google_live_reviews SET suspected_spam=${spam},approved_version=NULL,version=version+1,scheduled_at=NULL,old_reply_requested_at=NULL
 WHERE id=${id} AND version=${version} AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed. Reload before changing its spam flag.',409);
 return {flagged:spam,published:false};
}

export async function cancelScheduledReply(actor:ReviewActor,id:string,sql=liveDb()){
 await loadLiveReview(actor,id,sql);
 const rows=await sql`UPDATE google_live_reviews SET auto_schedule_cancelled=true,scheduled_at=NULL,old_reply_requested_at=NULL WHERE id=${id} AND publish_state='idle' RETURNING id`;
 if(!rows.length)throw new LiveReviewError('Reply is already being submitted. Refresh its status.');
 return {cancelled:true};
}
