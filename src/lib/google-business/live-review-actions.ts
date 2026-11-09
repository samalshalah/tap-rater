import { randomUUID } from "node:crypto";
import { generateReviewSuggestions } from "../review-ai-provider";
import { resolveReviewWorkerAlert } from "../review-worker-alerts";
import { replyStyles } from "../review-ai-options";
import type { ReviewActor } from "../review-workspaces";
import { livePublishingEnabled, liveDb, LiveReviewError, actorEmail, reviewStars, clientFor, loadLiveReview, reserveAi, assertReviewNotSpam, scheduledReplyEligible } from "./live-review-core";

export async function saveLiveDraft(actor:ReviewActor,id:string,draft:string,version:number,sql=liveDb()){
 const {review}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 const rows=await sql`UPDATE google_live_reviews SET draft=${draft},version=version+1,publish_state='idle',auto_schedule_cancelled=true,scheduled_at=NULL,old_reply_requested_at=NULL WHERE id=${id} AND version=${version}
 AND NOT suspected_spam AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed or a publish is unresolved. Reload or check the publish result.');return rows[0];
}

export async function suggestLiveReply(actor:ReviewActor,id:string,sql=liveDb(),generate=generateReviewSuggestions){
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);if(review.data.comment?.trim())await reserveAi(String(link.business_id),sql);
 return generate(String(link.business_name),reviewStars(review.data),review.data.comment || '',undefined,{businessId:String(link.business_id),customerId:String(link.customer_id),service:'review_manual'});
}

export async function generateLiveReply(actor:ReviewActor,id:string,version:number,sql=liveDb()){
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 if(!link.ai_consent)throw new LiveReviewError('Turn on AI replies for this location before generating a reply.');
 if(Number(review.version)!==version)throw new LiveReviewError('This review changed. Reload it before generating a reply.');
 if(review.data.reviewReply?.comment||review.publish_state==='published')throw new LiveReviewError('This review already has a reply on Google.');
 if(['publishing','uncertain'].includes(review.publish_state))throw new LiveReviewError('Check the current Google publish result before generating another reply.');
 await reserveAi(String(link.business_id),sql);
 const suggestions=await generateReviewSuggestions(String(link.business_name),reviewStars(review.data),review.data.comment||'',undefined,{businessId:String(link.business_id),customerId:String(link.customer_id),service:'review_manual'});
 const style=Object.hasOwn(replyStyles,String(link.auto_style))?String(link.auto_style):'friendly';
 const draft=suggestions[style as keyof typeof replyStyles];
 const rows=await sql`UPDATE google_live_reviews SET draft=${draft},version=version+1,publish_state='idle',approved_version=NULL,auto_schedule_cancelled=true,scheduled_at=NULL,old_reply_requested_at=NULL
  WHERE id=${id} AND version=${version} AND NOT suspected_spam AND publish_state NOT IN ('publishing','uncertain')
  AND coalesce(data->'reviewReply'->>'comment','')='' RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed while the reply was being prepared. Reload it and try again.');
 return {generated:true,draft,version:Number(rows[0].version),published:false};
}

export async function publishLiveReply(actor:ReviewActor,id:string,version:number,automatic=false,sql=liveDb(),makeClient=clientFor){
 if(!livePublishingEnabled())throw new LiveReviewError('Live Google publishing is locked until API approval and the activation check are complete.');
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 if(Number(review.version)!==version || !String(review.draft).trim())throw new LiveReviewError('Save and review the latest draft before publishing.');
 if(automatic && (!link.auto_enabled || !link.ai_consent || !scheduledReplyEligible(review,link)))throw new LiveReviewError('Automatic posting is no longer eligible.');
 if(automatic&&review.old_reply_requested_at){
  const [budget]=await sql`SELECT count(*)::int AS used,min(attempted_at)+interval '1 hour' AS next_at FROM google_live_reviews WHERE business_id=${link.business_id} AND old_reply_requested_at IS NOT NULL AND attempted_at>now()-interval '1 hour' AND publish_state IN ('published','publishing','uncertain')`;
  if(Number(budget?.used)>=60){await sql`UPDATE google_live_reviews SET scheduled_at=${budget.next_at}::timestamptz+interval '1 second' WHERE id=${id} AND version=${version} AND publish_state='idle'`;return {published:false};}
 }
 const client=await makeClient(String(link.owner));
 // Refresh immediately before a write so we do not blindly overwrite changes made on Google.
 const current=await client.getReview(String(review.resource));
 if((current.reviewReply?.comment || '')!==(review.data.reviewReply?.comment || '')
  || current.comment!==review.data.comment || current.starRating!==review.data.starRating)
  throw new LiveReviewError('The review text, rating, or reply changed on Google. Refresh it before publishing.');
 if(automatic && !scheduledReplyEligible({...review,data:current},link))throw new LiveReviewError('This review now needs manual attention.');
 const attempt=randomUUID();
 const claimed=await sql`UPDATE google_live_reviews r SET publish_state='publishing',attempt_id=${attempt},attempted_reply=draft,attempted_at=now()
 FROM google_review_links l,businesses b,customers c,google_business_connections g
 WHERE r.id=${id} AND NOT r.suspected_spam AND r.version=${version} AND r.publish_state NOT IN ('publishing','uncertain') AND r.business_id=l.business_id AND l.enabled
 AND b.id=l.business_id AND b.customer_id=l.customer_id AND c.id=b.customer_id AND c.account_status='active' AND marketing_location_allowed(b.id)
 AND g.owner=l.owner AND g.google_subject=l.google_subject AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)})
 AND (${!automatic} OR (l.auto_enabled AND l.ai_consent AND l.settings_version=${link.settings_version} AND r.scheduled_at<=now() AND NOT r.auto_schedule_cancelled AND (r.old_reply_requested_at IS NULL OR (SELECT count(*) FROM google_live_reviews prior WHERE prior.business_id=r.business_id AND prior.old_reply_requested_at IS NOT NULL AND prior.attempted_at>now()-interval '1 hour' AND prior.publish_state IN ('published','publishing','uncertain'))<60) AND r.scheduled_version=r.version AND r.schedule_consent_at=l.consent_at)) RETURNING r.id`;
 if(!claimed.length){
  const [state]=await sql`SELECT r.version,r.publish_state,r.scheduled_at,r.scheduled_version,r.schedule_consent_at,r.auto_schedule_cancelled,r.suspected_spam,
   l.enabled,l.ai_consent,l.auto_enabled,l.settings_version,l.consent_at,c.account_status,marketing_location_allowed(b.id) AS licensed,
   EXISTS(SELECT 1 FROM google_business_connections gc WHERE gc.owner=l.owner AND gc.google_subject=l.google_subject) AS connected,
   (SELECT count(*)::int FROM google_live_reviews p WHERE p.business_id=r.business_id AND p.old_reply_requested_at IS NOT NULL AND p.attempted_at>now()-interval '1 hour' AND p.publish_state IN ('published','publishing','uncertain')) AS recent_old_reply_attempts
   FROM google_live_reviews r JOIN google_review_links l ON l.business_id=r.business_id JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id
   JOIN customers c ON c.id=b.customer_id WHERE r.id=${id}`;
  if(state&&automatic&&Number(state.recent_old_reply_attempts)>=60){
   const [budget]=await sql`SELECT min(attempted_at)+interval '1 hour' AS next_at FROM google_live_reviews WHERE business_id=${link.business_id} AND old_reply_requested_at IS NOT NULL AND attempted_at>now()-interval '1 hour' AND publish_state IN ('published','publishing','uncertain')`;
   await sql`UPDATE google_live_reviews SET scheduled_at=greatest(now(),${budget?.next_at||null}::timestamptz)+interval '1 second' WHERE id=${id} AND version=${version} AND publish_state='idle'`;
   return {published:false};
  }
  const reason=!state?'Review was removed or is no longer available.'
   :state.publish_state!=='idle'?'Another publish check has already claimed this review.'
   :Number(state.version)!==version?'The saved reply changed while it was being checked.'
   :Number(state.scheduled_version)!==Number(state.version)?'The automatic queue version no longer matches the saved reply.'
   :!state.scheduled_at||new Date(state.scheduled_at).getTime()>Date.now()?'This reply is no longer due for posting.'
   :!state.enabled||!state.ai_consent||!state.auto_enabled?'Automatic replies were turned off for this location.'
   :!state.connected?'The Google connection is no longer available.'
   :state.account_status!=='active'||!state.licensed?'The client account or location access is inactive.'
   :Number(state.settings_version)!==Number(link.settings_version)||new Date(state.consent_at).getTime()!==new Date(link.consent_at).getTime()||new Date(state.schedule_consent_at).getTime()!==new Date(state.consent_at).getTime()?'The location reply settings changed while this reply was queued.'
   :state.auto_schedule_cancelled?'This automatic reply was cancelled.'
   :state.suspected_spam?'This review is flagged for spam review.'
   :'Google’s publish conditions changed during the final check.';
  throw new LiveReviewError(`Automatic publishing stopped: ${reason}`);
 }
 try{
  const reply=await client.publishReply(String(review.resource),String(review.draft));
  if(reply.comment!==review.draft)throw new LiveReviewError('Google did not confirm the exact reply. Check the publishing result.');
  await sql`UPDATE google_live_reviews SET data=jsonb_set(data,'{reviewReply}',${JSON.stringify(reply)}::jsonb),publish_state='published',version=version+1,fetched_at=now(),scheduled_at=NULL,last_publish_error=NULL WHERE id=${id} AND attempt_id=${attempt}`;
  return {published:true};
 }catch(error){
  const message=error instanceof Error?error.message:'Google did not confirm the reply.';
  await sql`UPDATE google_live_reviews SET publish_state='uncertain',last_publish_error=${message.slice(0,1000)} WHERE id=${id} AND attempt_id=${attempt}`;
  throw new LiveReviewError('Publishing was not confirmed. Use Check publish result before taking another action. No automatic retry will be sent.');
 }
}

export async function reconcileLiveReply(actor:ReviewActor,id:string,sql=liveDb(),makeClient=clientFor){
 const {review,link}=await loadLiveReview(actor,id,sql);
 if(!['publishing','uncertain'].includes(review.publish_state))return {resolved:true};
 if(Date.now()-new Date(review.attempted_at).getTime()<60_000)throw new LiveReviewError('Wait one minute for the outstanding Google request to finish.');
 const current=await (await makeClient(String(link.owner))).getReview(String(review.resource));
 const actualReply=String(current.reviewReply?.comment||'').trim();
 const matched=Boolean(actualReply)&&actualReply===String(review.attempted_reply||'').trim();
 const stale=Date.now()-new Date(review.attempted_at).getTime()>300_000;
 const hasOtherReply=Boolean(actualReply)&&!matched;
 const rating=reviewStars(current);
 const starEnabled=(rating===4&&link.auto_four)||(rating===5&&link.auto_five);
 const withinConsent=Boolean(review.old_reply_requested_at||(
  current.createTime&&link.consent_at&&new Date(current.createTime).getTime()>new Date(link.consent_at).getTime()
 ));
 const retryable=stale&&!actualReply&&Boolean(link.enabled&&link.ai_consent&&link.auto_enabled&&link.consent_at&&starEnabled
  &&review.draft&&!review.suspected_spam&&!review.auto_schedule_cancelled&&withinConsent
  &&review.schedule_consent_at&&new Date(review.schedule_consent_at).getTime()===new Date(link.consent_at).getTime()
  &&Number(review.schedule_failures||0)<5);
 const nextState=matched?'published':hasOtherReply||stale?'idle':'uncertain';
 const updated=await sql`UPDATE google_live_reviews SET data=${JSON.stringify(current)}::jsonb,fetched_at=now(),
  publish_state=${nextState},version=version+1,
  scheduled_at=CASE WHEN ${retryable} THEN now() ELSE NULL END,
  scheduled_version=CASE WHEN ${retryable} THEN version+1 ELSE NULL END,
  schedule_consent_at=CASE WHEN ${retryable} THEN ${link.consent_at}::timestamptz ELSE NULL END,
  schedule_failures=CASE WHEN ${retryable} THEN schedule_failures+1 WHEN ${hasOtherReply} THEN 0 ELSE schedule_failures END,
  last_publish_error=CASE WHEN ${matched||hasOtherReply||retryable} THEN NULL ELSE last_publish_error END,
  auto_schedule_cancelled=CASE WHEN ${hasOtherReply} THEN true ELSE auto_schedule_cancelled END
 WHERE id=${id} AND attempt_id=${review.attempt_id} AND publish_state IN ('publishing','uncertain') RETURNING id`;
 if(!updated.length)throw new LiveReviewError('This review changed while Google was being checked. Refresh its status.');
 if(matched||hasOtherReply)await resolvePublishAlertIfClear(sql,String(link.business_id));
 return {resolved:matched||hasOtherReply||stale,published:matched,alreadyReplied:hasOtherReply,queued:retryable,needsAttention:stale&&!matched&&!hasOtherReply&&!retryable};
}

/** Verify the live Google record before recovering a failed 4–5-star automatic reply. */
export async function verifyAndRecoverLiveReply(actor:ReviewActor,id:string,businessId:string,sql=liveDb(),makeClient=clientFor,automatic=false){
 const {review,link}=await loadLiveReview(actor,id,sql);
 if(String(review.business_id)!==businessId)throw new LiveReviewError('This review does not belong to the selected location.',404);
 if(['publishing','uncertain'].includes(review.publish_state))return reconcileLiveReply(actor,id,sql,makeClient);
 if(review.publish_state!=='idle'||!review.draft||Number(review.schedule_failures||0)<1)throw new LiveReviewError('This review is no longer a failed automatic reply. Refresh the location status.');
 const current=await (await makeClient(String(link.owner))).getReview(String(review.resource));
 const actualReply=String(current.reviewReply?.comment||'').trim();
 if(actualReply){
  const updated=await sql`UPDATE google_live_reviews SET data=${JSON.stringify(current)}::jsonb,fetched_at=now(),version=version+1,scheduled_at=NULL,scheduled_version=NULL,schedule_consent_at=NULL,schedule_failures=0,last_publish_error=NULL,auto_schedule_cancelled=true
   WHERE id=${id} AND version=${review.version} AND publish_state='idle' RETURNING id`;
  if(!updated.length)throw new LiveReviewError('This review changed during the Google check. Refresh its status.');
  await resolvePublishAlertIfClear(sql,String(link.business_id));
  return {resolved:true,published:actualReply===String(review.attempted_reply||'').trim(),alreadyReplied:true,queued:false,needsAttention:false};
 }
 const rating=reviewStars(current),starEnabled=(rating===4&&link.auto_four)||(rating===5&&link.auto_five);
 const withinConsent=Boolean(review.old_reply_requested_at||(current.createTime&&link.consent_at&&new Date(current.createTime).getTime()>new Date(link.consent_at).getTime()));
 if(!link.enabled||!link.ai_consent||!link.auto_enabled||!link.consent_at||!starEnabled||review.suspected_spam||review.auto_schedule_cancelled||!withinConsent){
  await sql`UPDATE google_live_reviews SET data=${JSON.stringify(current)}::jsonb,fetched_at=now(),version=version+1,scheduled_at=NULL,scheduled_version=NULL,schedule_consent_at=NULL,auto_schedule_cancelled=true
   WHERE id=${id} AND version=${review.version} AND publish_state='idle'`;
  return {resolved:true,published:false,alreadyReplied:false,queued:false,needsAttention:true};
 }
 const updated=await sql`UPDATE google_live_reviews SET data=${JSON.stringify(current)}::jsonb,fetched_at=now(),version=version+1,scheduled_at=now(),scheduled_version=version+1,schedule_consent_at=${link.consent_at},schedule_failures=${automatic?Number(review.schedule_failures||0)+1:0},last_publish_error=NULL,auto_schedule_cancelled=false
  WHERE id=${id} AND version=${review.version} AND publish_state='idle' AND schedule_failures>0 AND coalesce(data->'reviewReply'->>'comment','')='' RETURNING id`;
 if(!updated.length)throw new LiveReviewError('This review changed during the Google check. Refresh its status.');
 return {resolved:true,published:false,alreadyReplied:false,queued:true,needsAttention:false};
}

export async function resolvePublishAlertIfClear(sql:ReturnType<typeof liveDb>,businessId:string){
 const [row]=await sql`SELECT EXISTS(SELECT 1 FROM google_live_reviews r WHERE r.business_id=${businessId}
  AND (r.publish_state IN ('publishing','uncertain') OR (r.publish_state='idle' AND r.schedule_failures>0 AND r.scheduled_at IS NULL AND r.draft<>'' AND coalesce(r.data->'reviewReply'->>'comment','')=''))) AS pending`;
 if(!row?.pending)await resolveReviewWorkerAlert(sql,businessId,'publish');
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
