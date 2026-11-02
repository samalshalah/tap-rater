import {randomUUID} from 'node:crypto';
import {liveDb} from './google-business/live-review-core';
import {invokeMeteredAi,aiRate} from './ai-usage-meter';
import {assessReviewPolicy} from './review-policy';

export async function checkNextReviewPolicy(sql=liveDb(),businessId:string|null=null,invoke=invokeMeteredAi){
 const claim=randomUUID();
 const [r]=await sql`WITH candidate AS (
   SELECT r.id,l.customer_id FROM google_live_reviews r
   JOIN google_review_links l ON l.business_id=r.business_id
   JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id
   JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
   WHERE l.enabled AND l.ai_consent AND marketing_location_allowed(b.id) AND b.status IS DISTINCT FROM 'marketing_removed'
     AND (${businessId}::uuid IS NULL OR b.id=${businessId}::uuid)
     AND r.data->>'starRating' IN ('ONE','TWO','THREE') AND r.fetched_at>now()-interval '30 days'
     AND length(trim(coalesce(r.data->>'comment','')))>0 AND r.policy_check IS NULL
     AND (r.policy_retry_at IS NULL OR r.policy_retry_at<=now())
   ORDER BY r.created_at DESC LIMIT 1 FOR UPDATE OF r SKIP LOCKED
 ) UPDATE google_live_reviews r SET policy_claim=${claim}::uuid,policy_retry_at=now()+interval '30 minutes'
 FROM candidate c WHERE r.id=c.id RETURNING r.id,r.business_id,c.customer_id,r.data->>'comment' AS comment`;
 if(!r)return false;
 const check=await assessReviewPolicy(r.comment,input=>invoke({businessId:r.business_id,customerId:r.customer_id,service:'review_policy'},aiRate.model,input));
 const saved=await sql`UPDATE google_live_reviews r SET policy_check=${JSON.stringify(check)}::jsonb,policy_claim=NULL,policy_retry_at=NULL
 FROM google_review_links l WHERE r.id=${r.id} AND r.policy_claim=${claim}::uuid AND r.business_id=l.business_id AND l.enabled AND l.ai_consent AND l.customer_id=${r.customer_id} AND marketing_location_allowed(l.business_id) RETURNING r.id`;
 return Boolean(saved.length);
}
