import {businessOptimizationEnabled} from '../business-optimization-feature';
import { reviewWorkerFailure, resolveReviewWorkerAlert } from '../review-worker-alerts';
import { randomUUID } from "node:crypto";
import { GoogleBusinessError } from "./client";
import { generateReviewSuggestions } from "../review-ai-provider";
import type { ReplyStyle } from "../review-ai-options";
import { liveDb, LiveReviewError, ReviewAiWaitError, reviewStars, clientFor, authorizedLink, reserveAi, scheduleSavedReply, queueHistoricalPositives } from "./live-review-core";
import { syncLiveReviews } from "./live-review-workspaces";
import { publishLiveReply } from "./live-review-actions";

export async function prepareAutomaticDraft(businessId:string,sql=liveDb(),generate=generateReviewSuggestions,publish?:(id:string,version:number)=>Promise<{published:boolean}>){
 const link=await authorizedLink({kind:'admin'},businessId,sql);
 if(!link.enabled||!link.ai_consent)return {drafted:false};
 const claimTime=new Date().toISOString();
 const rows=await sql`UPDATE google_live_reviews r SET auto_attempt_at=${claimTime}::timestamptz
 WHERE r.id=(SELECT id FROM google_live_reviews WHERE business_id=${businessId} AND NOT suspected_spam AND draft='' AND draft_generated_at IS NULL
 AND approved_version IS NULL AND publish_state='idle' AND coalesce(data->'reviewReply'->>'comment','')=''
 AND (${Boolean(link.draft_low_stars&&link.review_knowledge_approved_at)} OR data->>'starRating' NOT IN ('ONE','TWO','THREE'))
 AND NOT auto_schedule_cancelled AND fetched_at>now()-interval '30 days' AND (old_reply_requested_at IS NOT NULL OR NULLIF(data->>'createTime','')::timestamptz>coalesce(${link.consent_at||null}::timestamptz,now()-interval '1 day')) AND (auto_attempt_at IS NULL OR auto_attempt_at<now()-interval '15 minutes')
 ORDER BY CASE WHEN ${Boolean(link.auto_enabled)} AND NULLIF(data->>'createTime','')::timestamptz>${link.consent_at||null}::timestamptz AND ((data->>'starRating'='FOUR' AND ${Boolean(link.auto_four)}) OR (data->>'starRating'='FIVE' AND ${Boolean(link.auto_five)})) THEN 0 ELSE 1 END,auto_attempt_at NULLS FIRST,created_at,id LIMIT 1)
 AND NOT r.suspected_spam AND r.draft='' AND r.draft_generated_at IS NULL AND r.publish_state='idle' AND r.approved_version IS NULL
 AND (r.auto_attempt_at IS NULL OR r.auto_attempt_at<now()-interval '15 minutes') RETURNING r.*`;
 if(!rows.length){
  // A quiet queue is still a completed background check. Do not hide a retryable error.
  await sql`UPDATE google_review_links SET draft_checked_at=now() WHERE business_id=${businessId} AND enabled AND ai_consent AND settings_version=${link.settings_version}`;
  return {drafted:false};
 }
 const review=rows[0];
 try{
  await reserveAi(businessId,sql);
  const suggestions=await generate(String(link.business_name),reviewStars(review.data),review.data.comment||'',undefined,{businessId,customerId:String(link.customer_id),service:'review_automatic'});
  const saved=await sql`UPDATE google_live_reviews r SET draft=${suggestions[link.auto_style as ReplyStyle]},version=r.version+1,
   approved_version=NULL,draft_generated_at=now() FROM google_review_links l,businesses b,customers c,google_business_connections g
   WHERE r.id=${review.id} AND r.version=${review.version} AND r.auto_attempt_at=${claimTime}::timestamptz
   AND NOT r.suspected_spam AND r.draft='' AND r.draft_generated_at IS NULL AND r.approved_version IS NULL AND r.publish_state='idle'
   AND coalesce(r.data->'reviewReply'->>'comment','')='' AND r.business_id=l.business_id AND l.enabled AND l.ai_consent
   AND l.settings_version=${link.settings_version} AND (l.draft_low_stars AND l.review_knowledge_approved_at IS NOT NULL OR r.data->>'starRating' NOT IN ('ONE','TWO','THREE')) AND b.id=l.business_id AND b.customer_id=l.customer_id
   AND c.id=b.customer_id AND c.account_status='active' AND g.owner=l.owner AND g.google_subject=l.google_subject RETURNING r.id`;
  await sql`UPDATE google_review_links SET draft_error=NULL,draft_checked_at=now() WHERE business_id=${businessId}`;
  await resolveReviewWorkerAlert(sql,businessId,'draft');
  if(saved.length)await scheduleSavedReply(String(review.id),Number(review.version)+1,sql);
  return {drafted:saved.length>0};
 }catch(error){
  if(error instanceof ReviewAiWaitError){
   // An expected allowance pause is not an AI/provider failure. Never retry it every minute.
   await sql`UPDATE google_review_links SET draft_error=${error.message},draft_checked_at=now(),
    draft_due_at=CASE WHEN ${error.reason==='monthly'} THEN (date_trunc('month',now() AT TIME ZONE 'America/New_York')+interval '1 month') AT TIME ZONE 'America/New_York' ELSE now()+interval '1 hour' END
    WHERE business_id=${businessId}`;
   await resolveReviewWorkerAlert(sql,businessId,'draft');
   return {drafted:false,deferred:error.reason};
  }
  await sql`UPDATE google_review_links SET draft_error=${error instanceof LiveReviewError&&error.status===429?'Draft generation is queued until the hourly AI limit or cooldown resets.':'Automatic drafting could not finish. It will retry; you can also write a draft manually.'},draft_checked_at=now() WHERE business_id=${businessId}`;
  const failures=await reviewWorkerFailure(sql,businessId,'draft');
  await sql`UPDATE google_review_links SET draft_due_at=now()+${Math.min(60,2**Math.min(failures,6))}*interval '1 minute' WHERE business_id=${businessId}`;
  return {drafted:false};
 }
}

export async function runLiveReviewMaintenance(sql=liveDb(),makeClient=clientFor,generate=generateReviewSuggestions){
 const workerToken=randomUUID(),deadline=Date.now()+50_000,publishDeadline=Date.now()+15_000,importDeadline=Date.now()+35_000;
 // A database lease prevents overlapping cron invocations from multiplying API traffic.
 const lease=await sql`UPDATE google_review_worker_lease SET token=${workerToken},lease_until=now()+interval '4 minutes' WHERE id=1 AND lease_until<now() RETURNING id`;
 if(!lease.length)return {synced:0,drafted:0,published:0,busy:true};
 let synced=0,drafted=0,published=0;
 try {
 if(new Date().getUTCHours()===0&&new Date().getUTCMinutes()===0)await sql`DELETE FROM google_live_reviews WHERE fetched_at<now()-interval '30 days'`;
 const due=await sql`SELECT id,version,business_id FROM (SELECT r.*,row_number() OVER(PARTITION BY business_id ORDER BY scheduled_at) AS turn FROM google_live_reviews r WHERE scheduled_at<=now() AND publish_state='idle' AND NOT auto_schedule_cancelled AND (old_reply_requested_at IS NULL OR (SELECT count(*) FROM google_live_reviews prior WHERE prior.business_id=r.business_id AND prior.old_reply_requested_at IS NOT NULL AND prior.attempted_at>now()-interval '1 hour' AND prior.publish_state IN ('published','publishing','uncertain'))<20)) fair ORDER BY turn,scheduled_at LIMIT 40`;
 for(const row of due){if(Date.now()>=publishDeadline)break;try{const result=await publishLiveReply({kind:'admin'},String(row.id),Number(row.version),true,sql,makeClient);if(result.published){published++;await resolveReviewWorkerAlert(sql,String(row.business_id),'publish');}}catch(error){
 await reviewWorkerFailure(sql,String(row.business_id),'publish',!(error instanceof GoogleBusinessError&&['quota','unavailable'].includes(error.code)));
 if(error instanceof GoogleBusinessError&&['quota','unavailable'].includes(error.code)){
 await sql`UPDATE google_live_reviews SET scheduled_at=CASE WHEN schedule_failures<5 THEN now()+power(2,schedule_failures)*interval '1 minute' ELSE NULL END,schedule_failures=schedule_failures+1 WHERE id=${row.id} AND publish_state='idle' AND scheduled_at IS NOT NULL`;
 continue;
 }
 // A changed review or uncertain write requires human review, never a blind retry.
 await sql`UPDATE google_live_reviews SET scheduled_at=NULL WHERE id=${row.id}`;
 }}
 const links=await sql`WITH due AS (SELECT l.business_id FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id JOIN customers c ON c.id=b.customer_id JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 WHERE l.enabled AND c.account_status='active' AND marketing_location_allowed(l.business_id) AND l.maintenance_due_at<=now()
 ORDER BY l.maintenance_due_at,l.business_id LIMIT 80 FOR UPDATE OF l SKIP LOCKED)
 UPDATE google_review_links l SET maintenance_due_at=now()+interval '15 minutes' FROM due WHERE l.business_id=due.business_id RETURNING l.business_id,l.profile_ai_enabled`;
 let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<links.length&&Date.now()<importDeadline){const row=links[cursor++],id=String(row.business_id);
 try{await syncLiveReviews({kind:'admin'},id,sql,makeClient);synced++;await resolveReviewWorkerAlert(sql,id,'import');}catch{const failures=await reviewWorkerFailure(sql,id,'import');await sql`UPDATE google_review_links SET maintenance_due_at=now()+${Math.min(60,5*2**Math.min(failures-1,4))}*interval '1 minute' WHERE business_id=${id}`;}

 if(businessOptimizationEnabled&&row.profile_ai_enabled)try{const {prepareProfileAgentDraft}=await import('../profile-ai-agent');await prepareProfileAgentDraft(id,sql);}catch{/* Isolate profiles. */}
 }}));
 if(cursor<links.length)await sql`UPDATE google_review_links SET maintenance_due_at=now() WHERE business_id=ANY(${links.slice(cursor).map(r=>String(r.business_id))}::uuid[])`;
 const draftLinks=await sql`WITH due AS (SELECT l.business_id FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id JOIN customers c ON c.id=b.customer_id WHERE l.enabled AND l.ai_consent AND c.account_status='active' AND marketing_location_allowed(l.business_id) AND l.draft_due_at<=now() ORDER BY l.draft_due_at,l.business_id LIMIT 80 FOR UPDATE OF l SKIP LOCKED) UPDATE google_review_links l SET draft_due_at=now()+interval '1 minute' FROM due WHERE l.business_id=due.business_id RETURNING l.business_id`;
 let draftCursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(draftCursor<draftLinks.length&&Date.now()<deadline){const id=String(draftLinks[draftCursor++].business_id);try{await queueHistoricalPositives(id,sql);const result=await prepareAutomaticDraft(id,sql,generate);if(result.drafted)drafted++;}catch{await reviewWorkerFailure(sql,id,'draft');}}}));
 if(draftCursor<draftLinks.length)await sql`UPDATE google_review_links SET draft_due_at=now() WHERE business_id=ANY(${draftLinks.slice(draftCursor).map(r=>String(r.business_id))}::uuid[])`;
 // Support delivery is consolidated by the client-failures monitor.
 return {synced,drafted,published};
 }finally{await sql`UPDATE google_review_worker_lease SET lease_until=now() WHERE id=1 AND token=${workerToken}`;}
}
