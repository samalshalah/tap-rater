import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createGoogleBusinessClient, type GoogleReview } from "./client";
import { googleAccessToken } from "./connection";
import type { ReviewActor } from "../review-workspaces";


export const livePublishingEnabled = () => process.env.GOOGLE_REVIEWS_PUBLISHING_ENABLED === "true";

export const liveDb = () => neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL!);

export class LiveReviewError extends Error { constructor(message:string,public status=409){super(message);} }

export class ReviewAiWaitError extends LiveReviewError {
 constructor(public reason:'hourly'|'monthly'){super(reason==='monthly'?'Monthly AI allowance exhausted. Drafts wait until the monthly allowance resets or access is updated.':'Draft generation is queued until the hourly AI limit or cooldown resets.',429);}
}

export const actorEmail=(a:ReviewActor)=>a.kind==='customer'?a.email.trim().toLowerCase():'';

export const stars:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};

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

export async function loadLiveReview(actor:ReviewActor,id:string,sql=liveDb()){
 const rows=await sql`SELECT * FROM google_live_reviews WHERE id=${id} AND fetched_at>now()-interval '30 days'`;
 if(!rows[0])throw new LiveReviewError('Review is unavailable. Sync Google reviews again.',404);
 const review=rows[0],link=await authorizedLink(actor,String(review.business_id),sql);
 if(!link.enabled)throw new LiveReviewError('Google review access is stopped.');
 return {review,link};
}

export async function reserveAi(businessId:string,sql=liveDb()){
 const rows=await sql`SELECT ${businessId}::uuid AS business_id WHERE reserve_review_ai_hour(${businessId}::uuid)`;
 if(!rows.length)throw new ReviewAiWaitError('hourly');
 const [allowance]=await sql`SELECT reserve_marketing_units(${businessId}::uuid,'ai',1,${randomUUID()}) AS allowed`;
 if(!allowance?.allowed)throw new ReviewAiWaitError('monthly');
}

export function isAutomaticCandidate(data:GoogleReview,draft:string,link:{auto_four:boolean;auto_five:boolean;consent_at:unknown}){
 const rating=reviewStars(data);
 return !draft.trim() && !data.reviewReply?.comment && ((rating===4&&link.auto_four)||(rating===5&&link.auto_five))
 && Boolean(data.createTime) && new Date(data.createTime!).getTime()>new Date(String(link.consent_at)).getTime();
}

export function assertReviewNotSpam(review:{suspected_spam?:boolean}){
 if(review.suspected_spam)throw new LiveReviewError('This review is marked as suspected spam. Remove the flag before preparing or approving a reply.',409);
}

export function scheduledReplyEligible(review:any,link:any,now=Date.now()):boolean {
 const rating=reviewStars(review.data);
 return Boolean(link.enabled&&link.auto_enabled&&link.ai_consent&&!review.suspected_spam&&!review.auto_schedule_cancelled
 && !review.data.reviewReply?.comment && ((rating===4&&link.auto_four)||(rating===5&&link.auto_five))
 && review.scheduled_at && new Date(review.scheduled_at).getTime()<=now
 && Number(review.scheduled_version)===Number(review.version)
 && link.consent_at && new Date(review.schedule_consent_at).getTime()===new Date(link.consent_at).getTime()
 && (review.old_reply_requested_at || isAutomaticCandidate(review.data,'',link)));
}

export async function scheduleSavedReply(id:string,version:number,sql=liveDb()){
 await sql`UPDATE google_live_reviews r SET scheduled_at=CASE WHEN r.old_reply_requested_at IS NOT NULL THEN greatest(now(),r.old_reply_requested_at+interval '1 hour') ELSE now()+l.reply_delay_minutes*interval '1 minute' END,scheduled_version=r.version,schedule_consent_at=l.consent_at,schedule_failures=0
 FROM google_review_links l WHERE r.id=${id} AND r.version=${version} AND r.approved_version IS NULL AND r.business_id=l.business_id AND l.enabled AND l.ai_consent AND l.auto_enabled
 AND NOT r.auto_schedule_cancelled AND r.draft<>'' AND r.draft_generated_at IS NOT NULL AND NOT r.suspected_spam AND r.publish_state='idle' AND r.scheduled_at IS NULL
 AND coalesce(r.data->'reviewReply'->>'comment','')='' AND ((r.data->>'starRating'='FOUR' AND l.auto_four) OR (r.data->>'starRating'='FIVE' AND l.auto_five))
 AND (r.old_reply_requested_at IS NOT NULL OR NULLIF(r.data->>'createTime','')::timestamptz>l.consent_at)`;
}

export async function queueHistoricalPositives(businessId:string,sql=liveDb()){
 await sql`UPDATE google_live_reviews r SET old_reply_requested_at=now() FROM google_review_links l
 WHERE r.business_id=${businessId} AND l.business_id=r.business_id AND l.enabled AND l.ai_consent AND l.auto_enabled AND l.consent_at IS NOT NULL
 AND NOT r.auto_schedule_cancelled AND NOT r.suspected_spam AND r.old_reply_requested_at IS NULL AND r.scheduled_at IS NULL AND r.draft='' AND r.draft_generated_at IS NULL AND r.approved_version IS NULL AND r.publish_state='idle'
 AND r.fetched_at>now()-interval '30 days' AND coalesce(r.data->'reviewReply'->>'comment','')='' AND NULLIF(r.data->>'createTime','')::timestamptz<=l.consent_at
 AND ((r.data->>'starRating'='FOUR' AND l.auto_four) OR (r.data->>'starRating'='FIVE' AND l.auto_five))`;
}
