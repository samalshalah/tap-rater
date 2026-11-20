import {liveDb} from './google-business/live-reviews';

type Sql=ReturnType<typeof liveDb>;

/**
 * When a customer's Google Reviews access has truly ended, release their Google locations so the business can be
 * connected again (by them after resubscribing, or by another account):
 *  - the link is switched off and marked released (reconnected_to = itself), which frees the one-link-per-Google-location
 *    slot while keeping the row, so imported reviews stay for the 30-day retention instead of being cascade-deleted;
 *  - scheduled automatic posts are cancelled;
 *  - Tap Rater's stored copy of the Google sign-in is deleted when no other active link uses it. The grant is not
 *    revoked at Google, because one Google account can be connected to other locations;
 *  - first-login setup reopens, so a returning subscriber is guided through Connect Google again.
 *
 * "Truly ended" avoids disconnecting a renewal that is a few hours late or a card that Stripe is still retrying:
 * paid access needs the Stripe subscription itself to be canceled, unpaid or expired (with no live one);
 * complimentary or manual access needs its end date to have passed.
 */
export async function releaseEndedReviewsAccess(sql:Sql=liveDb()){
 const released=await sql`WITH ended AS (
  SELECT a.customer_id FROM customer_marketing_access a
  WHERE NOT (a.status IN ('active','testing') AND (a.expires_at IS NULL OR a.expires_at>now()))
   AND ((a.source='paid'
     AND EXISTS(SELECT 1 FROM marketing_subscriptions m WHERE m.customer_id=a.customer_id AND m.status IN ('canceled','unpaid','incomplete_expired'))
     AND NOT EXISTS(SELECT 1 FROM marketing_subscriptions m WHERE m.customer_id=a.customer_id AND m.status IN ('active','trialing','past_due','incomplete')))
    OR (a.source IS DISTINCT FROM 'paid' AND a.expires_at IS NOT NULL AND a.expires_at<=now()))
 ), links AS (
  UPDATE google_review_links l SET enabled=false,reconnected_to=l.business_id,sync_lock=NULL,sync_lock_until=NULL,settings_version=l.settings_version+1
  FROM ended e WHERE l.customer_id=e.customer_id AND l.reconnected_to IS NULL
  RETURNING l.business_id,l.customer_id,l.owner
 ), unscheduled AS (
  UPDATE google_live_reviews r SET scheduled_at=NULL FROM links WHERE r.business_id=links.business_id AND r.publish_state='idle' AND r.scheduled_at IS NOT NULL RETURNING r.id
 ), setup AS (
  UPDATE customers c SET marketing_onboarding_completed_at=NULL FROM (SELECT DISTINCT customer_id FROM links) x WHERE c.id=x.customer_id RETURNING c.id
 ) SELECT business_id,customer_id,owner,(SELECT count(*)::int FROM unscheduled) AS unscheduled FROM links`;
 if(!released.length)return {released:0,connections:0};
 const owners=[...new Set(released.map(r=>String(r.owner)))];
 const removed=await sql`DELETE FROM google_business_connections g WHERE g.owner=ANY(${owners}::text[])
  AND NOT EXISTS(SELECT 1 FROM google_review_links l WHERE l.owner=g.owner AND l.reconnected_to IS NULL) RETURNING g.owner`;
 return {released:released.length,connections:removed.length};
}
