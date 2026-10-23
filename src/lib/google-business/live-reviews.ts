import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { createGoogleBusinessClient, type GoogleReview } from "./client";
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
 const links=await sql`SELECT l.business_id,l.owner,l.title,l.enabled,l.synced_at,l.next_page,l.last_error,l.ai_consent,l.auto_enabled,l.auto_four,l.auto_five,l.auto_style,l.settings_version,l.draft_error,l.draft_checked_at,
 b.business_name, (g.owner IS NOT NULL) AS connected,
 (SELECT ai_monthly_limit FROM customer_marketing_access WHERE customer_id=b.customer_id) AS ai_monthly_limit,
 (SELECT coalesce(sum(units),0) FROM marketing_usage_reservations WHERE business_id=b.id AND service='ai' AND month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date) AS ai_monthly_used FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
 LEFT JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 WHERE b.customer_id=l.customer_id AND c.account_status='active' AND marketing_location_allowed(b.id) AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)}) ORDER BY b.business_name`;
 const result=[];
 for(const link of links){
  const reviews=await sql`SELECT id,data,draft,version,publish_state,approved_version,suspected_spam FROM google_live_reviews WHERE business_id=${link.business_id} AND fetched_at>now()-interval '30 days' ORDER BY data->>'updateTime' DESC,id LIMIT 101`;
  result.push({...link,reviews:reviews.slice(0,100),moreReviews:reviews.length>100});
 }
 return result;
}
export async function liveReviewPage(actor:ReviewActor,businessId:string,offset:number,sql=liveDb()){
 await authorizedLink(actor,businessId,sql);
 const rows=await sql`SELECT id,data,draft,version,publish_state,approved_version,suspected_spam FROM google_live_reviews WHERE business_id=${businessId} AND fetched_at>now()-interval '30 days' ORDER BY data->>'updateTime' DESC,id LIMIT 101 OFFSET ${offset}`;
 return {reviews:rows.slice(0,100),moreReviews:rows.length>100};
}
export async function bindGoogleLocation(owner:string,businessId:string,account:string,location:string,sql=liveDb(),makeClient=clientFor,customerEmail:string|null=null){
 z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/).parse(account);z.string().regex(/^locations\/[A-Za-z0-9_-]+$/).parse(location);
 const businesses=await sql`SELECT b.customer_id FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE b.id=${businessId} AND c.account_status='active' AND (${customerEmail===null} OR lower(c.email)=${customerEmail})`;
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
 VALUES (${businessId},${businesses[0].customer_id},${owner},${connections[0].google_subject},${parent},${title},${customerEmail!==null},${preview.totalReviewCount??null}) ON CONFLICT DO NOTHING RETURNING business_id), named AS (UPDATE businesses b SET business_name=${title},address=${selectedAddress},google_place_id=NULL,google_review_url=NULL FROM linked l,customers c WHERE b.id=l.business_id AND b.customer_id=c.id AND c.marketing_onboarding_business_id=b.id AND c.marketing_onboarding_completed_at IS NULL RETURNING b.id) SELECT business_id FROM linked`;
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
   await sql`INSERT INTO google_live_reviews (business_id,resource,data,seen_run) SELECT ${businessId},${name},${JSON.stringify(review)}::jsonb,${run}
    FROM google_review_links WHERE business_id=${businessId} AND enabled AND sync_lock=${lock}
    ON CONFLICT (resource) DO UPDATE SET data=EXCLUDED.data,fetched_at=now(),seen_run=EXCLUDED.seen_run,
    version=google_live_reviews.version+CASE WHEN google_live_reviews.data IS DISTINCT FROM EXCLUDED.data THEN 1 ELSE 0 END
    WHERE google_live_reviews.business_id=EXCLUDED.business_id AND google_live_reviews.publish_state NOT IN ('publishing','uncertain')`;
  }
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
 const rows=await sql`UPDATE google_live_reviews SET draft=${draft},version=version+1,publish_state='idle' WHERE id=${id} AND version=${version}
 AND NOT suspected_spam AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed or a publish is unresolved. Reload or check the publish result.');return rows[0];
}
async function reserveAi(businessId:string,sql=liveDb()){
 const rows=await sql`UPDATE google_review_links SET ai_day=current_date,ai_calls=CASE WHEN ai_day=current_date THEN ai_calls+1 ELSE 1 END,ai_last_at=now()
 WHERE business_id=${businessId} AND enabled AND ai_consent AND (ai_day IS DISTINCT FROM current_date OR ai_calls<20)
 AND (ai_last_at IS NULL OR ai_last_at<now()-interval '10 seconds') RETURNING business_id`;
 if(!rows.length)throw new LiveReviewError('Enable AI permission and wait for the daily safety limit or cooldown to reset.',429);
 const [allowance]=await sql`SELECT reserve_marketing_units(${businessId}::uuid,'ai',1,${randomUUID()}) AS allowed`;
 if(!allowance?.allowed)throw new LiveReviewError('This location’s monthly AI allowance is used or package access has expired.',429);
}
export async function suggestLiveReply(actor:ReviewActor,id:string,sql=liveDb(),generate=generateReviewSuggestions){
 const {review,link}=await loadLiveReview(actor,id,sql);assertReviewNotSpam(review);await reserveAi(String(link.business_id),sql);
 return generate(String(link.business_name),reviewStars(review.data),review.data.comment || '',undefined,{businessId:String(link.business_id),customerId:String(link.customer_id),service:'review_manual'});
}
export const liveSettingsSchema=z.object({businessId:z.string().uuid(),aiConsent:z.boolean(),autoEnabled:z.boolean(),four:z.boolean(),five:z.boolean(),style:z.enum(['friendly','professional','personal','short']),version:z.number().int().positive(),confirmAutomaticPosting:z.boolean()}).strict();
export async function saveLiveSettings(actor:ReviewActor,input:z.infer<typeof liveSettingsSchema>,sql=liveDb()){
 const v=liveSettingsSchema.parse(input);const settingsLink=await authorizedLink(actor,v.businessId,sql);
 if(v.autoEnabled && String(settingsLink.owner).startsWith('customer:'))throw new LiveReviewError('Client connections are draft-only.',403);
 if(v.autoEnabled && (!livePublishingEnabled() || !v.aiConsent || !v.confirmAutomaticPosting || (!v.four&&!v.five)))throw new LiveReviewError('Live publishing must be activated, AI allowed, and automatic posting expressly confirmed for selected ratings.');
 const rows=await sql`UPDATE google_review_links SET ai_consent=${v.aiConsent},auto_enabled=${v.autoEnabled},auto_four=${v.four},auto_five=${v.five},auto_style=${v.style},
 consent_at=CASE WHEN ${v.autoEnabled} THEN now() ELSE NULL END,settings_version=settings_version+1
 WHERE business_id=${v.businessId} AND enabled AND settings_version=${v.version} RETURNING settings_version`;
 if(!rows.length)throw new LiveReviewError('Settings changed. Reload and try again.');return rows[0];
}
export async function stopLiveReviews(actor:ReviewActor,businessId:string,sql=liveDb()){
 // Stopping must remain possible after Google revokes the connection.
 const rows=await sql`UPDATE google_review_links l SET enabled=false,auto_enabled=false,ai_consent=false,settings_version=settings_version+1
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
 if(String(link.owner).startsWith('customer:'))throw new LiveReviewError('Client connections are draft-only. Approval does not publish.',403);
 if(Number(review.version)!==version || !String(review.draft).trim())throw new LiveReviewError('Save and review the latest draft before publishing.');
 if(automatic && (!link.auto_enabled || !link.ai_consent || !isAutomaticCandidate(review.data,'',link as never)))throw new LiveReviewError('Automatic posting is no longer eligible.');
 const client=await makeClient(String(link.owner));
 // Refresh immediately before a write so we do not blindly overwrite changes made on Google.
 const current=await client.getReview(String(review.resource));
 if((current.reviewReply?.comment || '')!==(review.data.reviewReply?.comment || '') || current.updateTime!==review.data.updateTime)throw new LiveReviewError('The review or reply changed on Google. Sync and review it again.');
 if(automatic && !isAutomaticCandidate(current,'',link as never))throw new LiveReviewError('This review now needs manual attention.');
 const attempt=randomUUID();
 const claimed=await sql`UPDATE google_live_reviews r SET publish_state='publishing',attempt_id=${attempt},attempted_reply=draft,attempted_at=now()
 FROM google_review_links l,businesses b,customers c,google_business_connections g
 WHERE r.id=${id} AND NOT r.suspected_spam AND r.version=${version} AND r.publish_state NOT IN ('publishing','uncertain') AND r.business_id=l.business_id AND l.enabled
 AND b.id=l.business_id AND b.customer_id=l.customer_id AND c.id=b.customer_id AND c.account_status='active'
 AND g.owner=l.owner AND g.google_subject=l.google_subject AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)})
 AND (${!automatic} OR (l.auto_enabled AND l.ai_consent AND l.settings_version=${link.settings_version})) RETURNING r.id`;
 if(!claimed.length)throw new LiveReviewError('Publishing is already underway or the workspace changed. Check the result before trying again.');
 try{
  const reply=await client.publishReply(String(review.resource),String(review.draft));
  if(reply.comment!==review.draft)throw new LiveReviewError('Google did not confirm the exact reply. Check the publishing result.');
  await sql`UPDATE google_live_reviews SET data=jsonb_set(data,'{reviewReply}',${JSON.stringify(reply)}::jsonb),publish_state='published',version=version+1,fetched_at=now() WHERE id=${id} AND attempt_id=${attempt}`;
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
/** Generate at most one draft per location per run. Never calls a Google write API. */
export async function prepareAutomaticDraft(businessId:string,sql=liveDb(),generate=generateReviewSuggestions){
 const link=await authorizedLink({kind:'admin'},businessId,sql);
 if(!link.enabled||!link.ai_consent)return {drafted:false};
 const claimTime=new Date().toISOString();
 const rows=await sql`UPDATE google_live_reviews r SET auto_attempt_at=${claimTime}::timestamptz
 WHERE r.id=(SELECT id FROM google_live_reviews WHERE business_id=${businessId} AND NOT suspected_spam AND draft='' AND draft_generated_at IS NULL
 AND approved_version IS NULL AND publish_state='idle' AND coalesce(data->'reviewReply'->>'comment','')=''
 AND fetched_at>now()-interval '1 day' AND (auto_attempt_at IS NULL OR auto_attempt_at<now()-interval '15 minutes')
 ORDER BY auto_attempt_at NULLS FIRST,created_at,id LIMIT 1)
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
   AND l.settings_version=${link.settings_version} AND b.id=l.business_id AND b.customer_id=l.customer_id
   AND c.id=b.customer_id AND c.account_status='active' AND g.owner=l.owner AND g.google_subject=l.google_subject RETURNING r.id`;
  await sql`UPDATE google_review_links SET draft_error=NULL,draft_checked_at=now() WHERE business_id=${businessId}`;
  return {drafted:saved.length>0};
 }catch(error){
  await sql`UPDATE google_review_links SET draft_error=${error instanceof LiveReviewError&&error.status===429?'Draft generation is queued until the daily AI allowance or cooldown resets.':'Automatic drafting could not finish. It will retry; you can also write a draft manually.'},draft_checked_at=now() WHERE business_id=${businessId}`;
  return {drafted:false};
 }
}
export async function runLiveReviewMaintenance(sql=liveDb(),makeClient=clientFor,generate=generateReviewSuggestions){
 await sql`DELETE FROM google_live_reviews WHERE fetched_at<now()-interval '30 days'`;
 const links=await sql`SELECT l.business_id FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id
 JOIN customers c ON c.id=b.customer_id JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 WHERE l.enabled AND c.account_status='active' AND marketing_location_allowed(l.business_id) AND EXISTS(SELECT 1 FROM customer_marketing_access ma WHERE ma.customer_id=c.id AND ma.status IN ('active','testing') AND (ma.expires_at IS NULL OR ma.expires_at>now())) ORDER BY l.checked_at NULLS FIRST,l.business_id LIMIT 12`;
 let synced=0,drafted=0;
 for(const row of links){
  const id=String(row.business_id);
  try{await syncLiveReviews({kind:'admin'},id,sql,makeClient);synced++;}catch{continue;}
  try{if((await prepareAutomaticDraft(id,sql,generate)).drafted)drafted++;}catch{/* One unavailable location must not block the others. */}
 }
 // Scheduled work can only import and save drafts, even if publishing is enabled elsewhere.
 return {synced,drafted,published:0};
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
 const rows=await sql`UPDATE google_live_reviews SET suspected_spam=${spam},approved_version=NULL,version=version+1
 WHERE id=${id} AND version=${version} AND publish_state NOT IN ('publishing','uncertain') RETURNING version`;
 if(!rows.length)throw new LiveReviewError('This review changed. Reload before changing its spam flag.',409);
 return {flagged:spam,published:false};
}
