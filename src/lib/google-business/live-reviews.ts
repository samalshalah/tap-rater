import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { createGoogleBusinessClient, GoogleBusinessError, type GoogleReview } from "./client";
import { googleAccessToken } from "./connection";
import { generateReviewSuggestions } from "../review-ai-provider";
import type { ReviewActor } from "../review-workspaces";
import type { ReplyStyle } from "../review-ai-options";
export const livePublishingEnabled = () => process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED === "true";
export const liveDb = () => neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL!);
export class LiveReviewError extends Error { constructor(message:string,public status=409){super(message);} }
const actorEmail=(a:ReviewActor)=>a.kind==='customer'?a.email.trim().toLowerCase():'';
const stars:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
export const reviewStars=(r:GoogleReview)=>stars[r.starRating] || 0;
export type LiveClient = ReturnType<typeof createGoogleBusinessClient>;
export const clientFor = async(owner:string)=>createGoogleBusinessClient(await googleAccessToken(owner));
export async function authorizedLink(actor:ReviewActor,businessId:string,sql=liveDb()) {
 const rows=await sql`SELECT l.*, b.business_name FROM google_review_links l JOIN businesses b ON b.id=l.business_id
 JOIN customers c ON c.id=b.customer_id JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 WHERE b.id=${businessId} AND b.customer_id=l.customer_id AND c.account_status='active'
 AND marketing_location_allowed(b.id) AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)})`;
 if(!rows[0])throw new LiveReviewError('Business connection is unavailable. Ask Tap Rater to check the connection and business assignment.',404);
 return rows[0];
}
export async function listLiveWorkspaces(actor:ReviewActor,sql=liveDb()) {
 const links=await sql`SELECT l.business_id,l.owner,l.title,l.enabled,l.synced_at,l.next_page,l.last_error,l.ai_consent,l.auto_enabled,l.auto_four,l.auto_five,l.auto_style,l.draft_low_stars,l.reply_delay_minutes,l.settings_version,l.draft_error,l.draft_checked_at,
 b.business_name, l.review_total, (SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=l.business_id AND (l.sync_run IS NULL OR r.seen_run=l.sync_run)) AS imported_count, (g.owner IS NOT NULL) AS connected,
 (SELECT ai_monthly_limit FROM customer_marketing_access WHERE customer_id=b.customer_id) AS ai_monthly_limit,
 (SELECT coalesce(sum(units),0) FROM marketing_usage_reservations WHERE business_id=b.id AND service='ai' AND month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date) AS ai_monthly_used FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
 LEFT JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 WHERE b.customer_id=l.customer_id AND c.account_status='active' AND marketing_location_allowed(b.id) AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)}) ORDER BY b.business_name`;
 const result=[];
 for(const link of links){
  const reviews=await sql`SELECT id,data,draft,version,publish_state,approved_version,suspected_spam,scheduled_at FROM google_live_reviews WHERE business_id=${link.business_id} AND fetched_at>now()-interval '30 days' ORDER BY data->>'updateTime' DESC,id LIMIT 101`;
  result.push({...link,reviews:reviews.slice(0,100),moreReviews:reviews.length>100});
 }
 return result;
}
export async function liveReviewPage(actor:ReviewActor,businessId:string,offset:number,sql=liveDb()){
 await authorizedLink(actor,businessId,sql);
 const rows=await sql`SELECT id,data,draft,version,publish_state,approved_version,suspected_spam,scheduled_at FROM google_live_reviews WHERE business_id=${businessId} AND fetched_at>now()-interval '30 days' ORDER BY data->>'updateTime' DESC,id LIMIT 101 OFFSET ${offset}`;
 return {reviews:rows.slice(0,100),moreReviews:rows.length>100};
}
export async function bindGoogleLocation(owner:string,businessId:string,account:string,location:string,sql=liveDb(),makeClient=clientFor,customerEmail:string|null=null){
 z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/).parse(account);z.string().regex(/^locations\/[A-Za-z0-9_-]+$/).parse(location);
 const businesses=await sql`SELECT b.customer_id FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE b.status IS DISTINCT FROM 'marketing_removed' AND b.id=${businessId} AND c.account_status='active' AND (${customerEmail===null} OR lower(c.email)=${customerEmail})`;
 const connections=await sql`SELECT google_subject FROM google_business_connections WHERE owner=${owner}`;
 if(!businesses[0] || !connections[0])throw new LiveReviewError('An active customer and connected Google account are required.');
 const client=await makeClient(owner);let token:string|undefined;let title='';let selectedAddress='';
 for(let page=0;page<100;page++){
  const result=await client.listLocations(account,token);const found=result.locations.find(l=>l.name===location);
  if(found){title=found.title || location;selectedAddress=[...(found.storefrontAddress?.addressLines||[]),found.storefrontAddress?.locality,found.storefrontAddress?.administrativeArea,found.storefrontAddress?.postalCode].filter(Boolean).join(', ');break;}token=result.nextPageToken;if(!token)break;
 }
 if(!title)throw new LiveReviewError('Choose a location returned by the connected Google account.');
 const parent=account+'/'+location;
 const preview=await client.listReviews(parent); // Read only the selected location before assignment.
 const rows=await sql`WITH linked AS (INSERT INTO google_review_links (business_id,customer_id,owner,google_subject,parent,title,ai_consent,review_total)
 VALUES (${businessId},${businesses[0].customer_id},${owner},${connections[0].google_subject},${parent},${title},${customerEmail!==null},${preview.totalReviewCount??null}) ON CONFLICT (business_id) DO UPDATE SET owner=EXCLUDED.owner,google_subject=EXCLUDED.google_subject,enabled=true,ai_consent=EXCLUDED.ai_consent,settings_version=google_review_links.settings_version+1 WHERE NOT google_review_links.enabled AND google_review_links.customer_id=EXCLUDED.customer_id AND google_review_links.parent=EXCLUDED.parent RETURNING business_id), named AS (UPDATE businesses b SET business_name=${title},address=${selectedAddress},google_place_id=NULL,google_review_url=NULL FROM linked l,customers c WHERE b.id=l.business_id AND b.customer_id=c.id AND c.marketing_onboarding_business_id=b.id AND c.marketing_onboarding_completed_at IS NULL RETURNING b.id) SELECT business_id FROM linked`;
 if(!rows.length)throw new LiveReviewError('This customer workspace or Google location is already assigned. Stop and remove its previous assignment first.');
 return {linked:true};
}
export async function syncLiveReviews(actor:ReviewActor,businessId:string,sql=liveDb(),makeClient=clientFor){
 const link=await authorizedLink(actor,businessId,sql);if(!link.enabled)throw new LiveReviewError('Google review access is stopped.');
 const lock=randomUUID();const run=link.sync_run || randomUUID();
 const claims=await sql`UPDATE google_review_links SET sync_lock=${lock},sync_lock_until=now()+interval '3 minutes',checked_at=now()
 WHERE business_id=${businessId} AND enabled AND (sync_lock_until IS NULL OR sync_lock_until<now())
 AND (checked_at IS NULL OR checked_at<now()-interval '10 seconds') RETURNING business_id`;
 if(!claims.length)throw new LiveReviewError('A sync is running or was just requested. Please wait briefly.');
 try{
  const client=await makeClient(String(link.owner));const page=await client.listReviews(String(link.parent),link.next_page || undefined);
  for(const review of page.reviews){
   if(!/^[A-Za-z0-9_-]+$/.test(review.reviewId))throw new LiveReviewError('Google returned an invalid review identifier.');
   const name=link.parent+'/reviews/'+review.reviewId;
   if(review.name && review.name!==name)throw new LiveReviewError('Google returned a review from a different location.');
  }
  if(page.reviews.length)await sql`INSERT INTO google_live_reviews (business_id,resource,data,seen_run)
    SELECT ${businessId},${String(link.parent)+'/reviews/'}||(item->>'reviewId'),item,${run}::uuid
    FROM jsonb_array_elements(${JSON.stringify(page.reviews)}::jsonb) AS item
    WHERE EXISTS(SELECT 1 FROM google_review_links WHERE business_id=${businessId} AND enabled AND sync_lock=${lock})
    ON CONFLICT (resource) DO UPDATE SET data=EXCLUDED.data,fetched_at=now(),seen_run=EXCLUDED.seen_run,
    version=google_live_reviews.version+CASE WHEN google_live_reviews.data IS DISTINCT FROM EXCLUDED.data THEN 1 ELSE 0 END
    WHERE google_live_reviews.business_id=EXCLUDED.business_id AND google_live_reviews.publish_state NOT IN ('publishing','uncertain')`;
  if(!page.nextPageToken)await sql`DELETE FROM google_live_reviews WHERE business_id=${businessId} AND seen_run IS DISTINCT FROM ${run}::uuid AND publish_state NOT IN ('publishing','uncertain')`;
  await sql`UPDATE google_review_links SET review_total=${page.totalReviewCount??null},next_page=${page.nextPageToken || null},sync_run=${page.nextPageToken?run:null},synced_at=now(),last_error=NULL WHERE business_id=${businessId} AND sync_lock=${lock}`;
  return {imported:page.reviews.length,more:Boolean(page.nextPageToken)};
 }catch(error){await sql`UPDATE google_review_links SET last_error='Sync failed. Reconnect Google or check API access and quota.' WHERE business_id=${businessId} AND sync_lock=${lock}`;throw error;}
 finally{await sql`UPDATE google_review_links SET sync_lock=NULL,sync_lock_until=NULL WHERE business_id=${businessId} AND sync_lock=${lock}`;}
}
export async function loadLiveReview(actor:ReviewActor,id:string,sql=liveDb()){
 const rows=await sql`SELECT * FROM google_live_reviews WHERE id=${id} AND fetched_at>now()-interval '30 days'`;
 if(!rows[0])throw new LiveReviewError('Review is unavailable. Sync Google reviews again.',404);
 const review=rows[0],link=await authorizedLink(actor,String(review.business_id),sql);
 if(!link.enabled)throw new LiveReviewError('Google review access is stopped.');
 return {review,link};
}
export async function saveLiveDraft(actor:ReviewActor,id:string,draft:string,version:number,sql=liveDb()){
 const {review}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 const rows=await sql`UPDATE google_live_reviews SET draft=${draft},version=version+1,publish_state='idle',scheduled_at=NULL,old_reply_requested_at=NULL WHERE id=${id} AND version=${version}
 AND NOT suspected_spam AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed or a publish is unresolved. Reload or check the publish result.');return rows[0];
}
async function reserveAi(businessId:string,sql=liveDb()){
 const rows=await sql`UPDATE google_review_links SET ai_day=current_date,ai_calls=CASE WHEN ai_day=current_date THEN ai_calls+1 ELSE 1 END,ai_last_at=now()
 WHERE business_id=${businessId} AND enabled AND ai_consent AND (ai_day IS DISTINCT FROM current_date OR ai_calls<20)
 AND (ai_last_at IS NULL OR ai_last_at<now()-interval '10 seconds') RETURNING business_id`;
 if(!rows.length)throw new LiveReviewError('Enable AI permission and wait for the daily safety limit or cooldown to reset.',429);
 const [allowance]=await sql`SELECT reserve_marketing_units(${businessId}::uuid,'ai',1,${randomUUID()}) AS allowed`;
 if(!allowance?.allowed)throw new LiveReviewError('The monthly AI allowance is used or package access has expired.',429);
}
export async function suggestLiveReply(actor:ReviewActor,id:string,sql=liveDb(),generate=generateReviewSuggestions){
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);await reserveAi(String(link.business_id),sql);
 return generate(String(link.business_name),reviewStars(review.data),review.data.comment || '',undefined,{businessId:String(link.business_id),customerId:String(link.customer_id),service:'review_manual'});
}
export const liveSettingsSchema=z.object({businessId:z.string().uuid(),aiConsent:z.boolean(),autoEnabled:z.boolean(),four:z.boolean(),five:z.boolean(),style:z.enum(['friendly','professional','personal','short']),version:z.number().int().positive(),confirmAutomaticPosting:z.boolean(),lowStars:z.boolean().optional(),delayMinutes:z.union([z.literal(60),z.literal(120),z.literal(360),z.literal(1440)]).optional()}).strict();
export async function saveLiveSettings(actor:ReviewActor,input:z.infer<typeof liveSettingsSchema>,sql=liveDb()){
 const v=liveSettingsSchema.parse(input);const settingsLink=await authorizedLink(actor,v.businessId,sql);
 if(v.autoEnabled && (!livePublishingEnabled() || !v.aiConsent || !v.confirmAutomaticPosting || (!v.four&&!v.five)))throw new LiveReviewError('Live publishing must be activated, AI allowed, and automatic posting expressly confirmed for selected ratings.');
 const rows=await sql`UPDATE google_review_links SET draft_low_stars=${v.lowStars??settingsLink.draft_low_stars??true},ai_consent=${v.aiConsent},auto_enabled=${v.autoEnabled},auto_four=${v.four},auto_five=${v.five},auto_style=${v.style},reply_delay_minutes=${v.delayMinutes??settingsLink.reply_delay_minutes??120},
 consent_at=CASE WHEN ${v.autoEnabled} THEN CASE WHEN auto_enabled AND auto_four=${v.four} AND auto_five=${v.five} THEN consent_at ELSE now() END ELSE NULL END,settings_version=settings_version+1
 WHERE business_id=${v.businessId} AND customer_id=${settingsLink.customer_id} AND parent=${settingsLink.parent} AND google_subject=${settingsLink.google_subject} AND enabled AND settings_version=${v.version} RETURNING settings_version`;
 if(!rows.length)throw new LiveReviewError('Settings changed. Reload and try again.');
 await sql`UPDATE google_live_reviews r SET scheduled_at=NULL,old_reply_requested_at=NULL FROM google_review_links l WHERE r.business_id=l.business_id AND l.business_id=${v.businessId} AND (NOT l.auto_enabled OR NOT l.ai_consent OR r.schedule_consent_at IS DISTINCT FROM l.consent_at OR (r.data->>'starRating'='FOUR' AND NOT l.auto_four) OR (r.data->>'starRating'='FIVE' AND NOT l.auto_five))`;return rows[0];
}
export async function stopLiveReviews(actor:ReviewActor,businessId:string,sql=liveDb()){
 // Stopping must remain possible after Google revokes the connection.
 const rows=await sql`UPDATE google_review_links l SET enabled=false,auto_enabled=false,ai_consent=false,profile_ai_enabled=false,settings_version=settings_version+1
 FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE l.business_id=${businessId} AND b.id=l.business_id AND b.customer_id=l.customer_id
 AND (${actor.kind==='admin'} OR (lower(c.email)=${actorEmail(actor)} AND c.account_status='active')) RETURNING l.business_id`;
 if(!rows.length)throw new LiveReviewError('Workspace unavailable.',404);return {stopped:true};
}
export function isAutomaticCandidate(data:GoogleReview,draft:string,link:{auto_four:boolean;auto_five:boolean;consent_at:unknown}){
 const rating=reviewStars(data);
 return !draft.trim() && !data.reviewReply?.comment && ((rating===4&&link.auto_four)||(rating===5&&link.auto_five))
 && Boolean(data.createTime) && new Date(data.createTime!).getTime()>new Date(String(link.consent_at)).getTime();
}
export async function publishLiveReply(actor:ReviewActor,id:string,version:number,automatic=false,sql=liveDb(),makeClient=clientFor){
 if(!livePublishingEnabled())throw new LiveReviewError('Live Google publishing is locked until API approval and the activation check are complete.');
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 if(Number(review.version)!==version || !String(review.draft).trim())throw new LiveReviewError('Save and review the latest draft before publishing.');
 if(automatic && (!link.auto_enabled || !link.ai_consent || !scheduledReplyEligible(review,link)))throw new LiveReviewError('Automatic posting is no longer eligible.');
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
 AND (${!automatic} OR (l.auto_enabled AND l.ai_consent AND l.settings_version=${link.settings_version} AND r.scheduled_at<=now() AND r.scheduled_version=r.version AND r.schedule_consent_at=l.consent_at)) RETURNING r.id`;
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
/** Generate one draft per location; positive replies enter the durable delay queue. */
export async function prepareAutomaticDraft(businessId:string,sql=liveDb(),generate=generateReviewSuggestions,publish?:(id:string,version:number)=>Promise<{published:boolean}>){
 const link=await authorizedLink({kind:'admin'},businessId,sql);
 if(!link.enabled||!link.ai_consent)return {drafted:false};
 const claimTime=new Date().toISOString();
 const rows=await sql`UPDATE google_live_reviews r SET auto_attempt_at=${claimTime}::timestamptz
 WHERE r.id=(SELECT id FROM google_live_reviews WHERE business_id=${businessId} AND NOT suspected_spam AND draft='' AND draft_generated_at IS NULL
 AND approved_version IS NULL AND publish_state='idle' AND coalesce(data->'reviewReply'->>'comment','')=''
 AND (${link.draft_low_stars!==false} OR data->>'starRating' NOT IN ('ONE','TWO','THREE'))
 AND fetched_at>now()-interval '1 day' AND (old_reply_requested_at IS NOT NULL OR NULLIF(data->>'createTime','')::timestamptz>coalesce(${link.consent_at||null}::timestamptz,now()-interval '1 day')) AND (auto_attempt_at IS NULL OR auto_attempt_at<now()-interval '15 minutes')
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
   AND l.settings_version=${link.settings_version} AND (l.draft_low_stars OR r.data->>'starRating' NOT IN ('ONE','TWO','THREE')) AND b.id=l.business_id AND b.customer_id=l.customer_id
   AND c.id=b.customer_id AND c.account_status='active' AND g.owner=l.owner AND g.google_subject=l.google_subject RETURNING r.id`;
  await sql`UPDATE google_review_links SET draft_error=NULL,draft_checked_at=now() WHERE business_id=${businessId}`;
  if(saved.length)await scheduleSavedReply(String(review.id),Number(review.version)+1,sql);
  return {drafted:saved.length>0};
 }catch(error){
  await sql`UPDATE google_review_links SET draft_error=${error instanceof LiveReviewError&&error.status===429?'Draft generation is queued until the daily AI allowance or cooldown resets.':'Automatic drafting could not finish. It will retry; you can also write a draft manually.'},draft_checked_at=now() WHERE business_id=${businessId}`;
  return {drafted:false};
 }
}
export async function runLiveReviewMaintenance(sql=liveDb(),makeClient=clientFor,generate=generateReviewSuggestions){
 const workerToken=randomUUID(),deadline=Date.now()+50_000;
 // A database lease prevents overlapping cron invocations from multiplying API traffic.
 const lease=await sql`UPDATE google_review_worker_lease SET token=${workerToken},lease_until=now()+interval '4 minutes' WHERE id=1 AND lease_until<now() RETURNING id`;
 if(!lease.length)return {synced:0,drafted:0,published:0,busy:true};
 let synced=0,drafted=0,published=0;
 try {
 if(new Date().getUTCHours()===0&&new Date().getUTCMinutes()===0)await sql`DELETE FROM google_live_reviews WHERE fetched_at<now()-interval '30 days'`;
 const due=await sql`SELECT id,version FROM google_live_reviews WHERE scheduled_at<=now() AND publish_state='idle' ORDER BY scheduled_at LIMIT 40`;
 for(const row of due){if(Date.now()>=deadline)break;try{await publishLiveReply({kind:'admin'},String(row.id),Number(row.version),true,sql,makeClient);published++;}catch(error){
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
 await Promise.all(Array.from({length:4},async()=>{while(cursor<links.length&&Date.now()<deadline){const row=links[cursor++],id=String(row.business_id);
 try{const result=await syncLiveReviews({kind:'admin'},id,sql,makeClient);synced++;if(result.more)await sql`UPDATE google_review_links SET maintenance_due_at=now()+interval '1 minute' WHERE business_id=${id}`;}catch{/* Retry on the next bounded cycle. */}
 try{const result=await prepareAutomaticDraft(id,sql,generate);if(result.drafted)drafted++;}catch{/* Isolate locations. */}
 if(row.profile_ai_enabled)try{const {prepareProfileAgentDraft}=await import('../profile-ai-agent');await prepareProfileAgentDraft(id,sql);}catch{/* Isolate profiles. */}
 }}));
 if(cursor<links.length)await sql`UPDATE google_review_links SET maintenance_due_at=now() WHERE business_id=ANY(${links.slice(cursor).map(r=>String(r.business_id))}::uuid[])`;
 return {synced,drafted,published};
 }finally{await sql`UPDATE google_review_worker_lease SET lease_until=now() WHERE id=1 AND token=${workerToken}`;}
}

export async function approveLiveDraft(actor:ReviewActor,id:string,version:number,sql=liveDb()){
 const {review}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);
 const rows=await sql`UPDATE google_live_reviews SET approved_version=version WHERE id=${id} AND version=${version} AND draft<>'' AND NOT suspected_spam AND publish_state='idle' RETURNING approved_version`;
 if(!rows.length)throw new LiveReviewError('Save and review the latest draft before approving.');
 return {approved:true};
}

export function assertReviewNotSpam(review:{suspected_spam?:boolean}){
 if(review.suspected_spam)throw new LiveReviewError('This review is marked as suspected spam. Remove the flag before preparing or approving a reply.',409);
}
export async function flagLiveReview(actor:ReviewActor,id:string,spam:boolean,version:number,sql=liveDb()){
 await loadLiveReview(actor,id,sql);
 const rows=await sql`UPDATE google_live_reviews SET suspected_spam=${spam},approved_version=NULL,version=version+1,scheduled_at=NULL,old_reply_requested_at=NULL
 WHERE id=${id} AND version=${version} AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed. Reload before changing its spam flag.',409);
 return {flagged:spam,published:false};
}

/** The same checks run again against Google's current review immediately before a write. */
export function scheduledReplyEligible(review:any,link:any,now=Date.now()):boolean {
 const rating=reviewStars(review.data);
 return Boolean(link.enabled&&link.auto_enabled&&link.ai_consent&&!review.suspected_spam
 && !review.data.reviewReply?.comment && ((rating===4&&link.auto_four)||(rating===5&&link.auto_five))
 && review.scheduled_at && new Date(review.scheduled_at).getTime()<=now
 && Number(review.scheduled_version)===Number(review.version)
 && link.consent_at && new Date(review.schedule_consent_at).getTime()===new Date(link.consent_at).getTime()
 && (review.old_reply_requested_at || isAutomaticCandidate(review.data,'',link)));
}
export async function scheduleSavedReply(id:string,version:number,sql=liveDb()){
 await sql`UPDATE google_live_reviews r SET scheduled_at=now()+l.reply_delay_minutes*interval '1 minute',scheduled_version=r.version,schedule_consent_at=l.consent_at,schedule_failures=0
 FROM google_review_links l WHERE r.id=${id} AND r.version=${version} AND r.approved_version IS NULL AND r.business_id=l.business_id AND l.enabled AND l.ai_consent AND l.auto_enabled
 AND r.draft<>'' AND r.draft_generated_at IS NOT NULL AND NOT r.suspected_spam AND r.publish_state='idle' AND r.scheduled_at IS NULL
 AND coalesce(r.data->'reviewReply'->>'comment','')='' AND ((r.data->>'starRating'='FOUR' AND l.auto_four) OR (r.data->>'starRating'='FIVE' AND l.auto_five))
 AND (r.old_reply_requested_at IS NOT NULL OR NULLIF(r.data->>'createTime','')::timestamptz>l.consent_at)`;
}
export async function olderReviews(actor:ReviewActor,businessId:string,confirm=false,sql=liveDb()){
 const link=await authorizedLink(actor,businessId,sql);
 if(!link.enabled||!link.ai_consent)throw new LiveReviewError('Enable AI replies for this location first.');
 const rows=await sql`SELECT id,data,draft,draft_generated_at FROM google_live_reviews WHERE business_id=${businessId} AND (${link.draft_low_stars!==false} OR data->>'starRating' NOT IN ('ONE','TWO','THREE')) AND NOT suspected_spam AND publish_state='idle' AND coalesce(data->'reviewReply'->>'comment','')='' AND fetched_at>now()-interval '30 days' AND scheduled_at IS NULL AND old_reply_requested_at IS NULL AND draft='' AND NULLIF(data->>'createTime','')::timestamptz<=coalesce(${link.consent_at||null}::timestamptz,now()) ORDER BY created_at LIMIT 5000`;
 const automatic=rows.filter(r=>link.auto_enabled&&((reviewStars(r.data)===4&&link.auto_four)||(reviewStars(r.data)===5&&link.auto_five))).length;
 if(confirm){
 await sql`UPDATE google_live_reviews SET old_reply_requested_at=now() WHERE business_id=${businessId} AND id=ANY(${rows.map(r=>String(r.id))}::uuid[]) AND draft='' AND publish_state='idle' AND NOT suspected_spam AND coalesce(data->'reviewReply'->>'comment','')=''`;
 await sql`UPDATE google_review_links SET maintenance_due_at=now() WHERE business_id=${businessId}`;
 }
 return {total:rows.length,scheduled:automatic,drafts:rows.length-automatic,queued:confirm,delayMinutes:link.reply_delay_minutes??120};
}
export async function cancelScheduledReply(actor:ReviewActor,id:string,sql=liveDb()){
 await loadLiveReview(actor,id,sql);
 const rows=await sql`UPDATE google_live_reviews SET scheduled_at=NULL,old_reply_requested_at=NULL WHERE id=${id} AND publish_state='idle' RETURNING id`;
 if(!rows.length)throw new LiveReviewError('Reply is already being submitted. Refresh its status.');
 return {cancelled:true};
}
