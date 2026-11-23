import {liveDb} from './google-business/live-reviews';
import {buildEmailHtml,getDefaultFromEmail,getOrderFromEmail,getOrderReplyToEmail,type EmailResult,type SendEmailInput} from './email';
import {sendCommerceEmail} from './commerce-email-outbox';

type Sql=ReturnType<typeof liveDb>;
type SendFn=(input:SendEmailInput)=>Promise<EmailResult>;

/**
 * Releases Google locations whose Reviews service has ended, so the business can be connected again (by the same
 * client after resubscribing or re-adding it, or by another account):
 *  - the link is switched off and marked released (reconnected_to = itself), which frees the one-link-per-Google-location
 *    slot while keeping the row, so imported reviews stay for the 30-day retention instead of being cascade-deleted;
 *  - scheduled automatic posts are cancelled;
 *  - Tap Rater's stored copy of the Google sign-in is deleted when no other active link uses it. The grant is not
 *    revoked at Google, because one Google account can be connected to other locations.
 *
 * Two cases are released:
 *  1. The whole account ended. "Truly ended" avoids disconnecting a renewal that is a few hours late or a card Stripe is
 *     still retrying: paid access needs the Stripe subscription itself to be canceled, unpaid or expired (with no live
 *     one); complimentary or manual access needs its end date to have passed. First-login setup also reopens, so a
 *     returning subscriber is guided through Connect Google again, and the client is emailed once.
 *  2. A single location removed from a plan that keeps running. Only removals applied at renewal through a plan change
 *     count (reviews_applied_plan_changes) and only while that location's licence is still off, so a location an admin
 *     paused, or one the client has since added back, is never released.
 */
export async function releaseEndedReviewsAccess(sql:Sql=liveDb(),{send=sendCommerceEmail,env=process.env}:{send?:SendFn;env?:Record<string,string|undefined>}={}){
 const released=await sql`WITH ended AS (
  SELECT a.customer_id FROM customer_marketing_access a
  WHERE NOT (a.status IN ('active','testing') AND (a.expires_at IS NULL OR a.expires_at>now()))
   AND ((a.source='paid'
     AND EXISTS(SELECT 1 FROM marketing_subscriptions m WHERE m.customer_id=a.customer_id AND m.status IN ('canceled','unpaid','incomplete_expired'))
     AND NOT EXISTS(SELECT 1 FROM marketing_subscriptions m WHERE m.customer_id=a.customer_id AND m.status IN ('active','trialing','past_due','incomplete')))
    OR (a.source IS DISTINCT FROM 'paid' AND a.expires_at IS NOT NULL AND a.expires_at<=now()))
 ), removed AS (
  SELECT DISTINCT p.customer_id, r.value::uuid AS business_id
  FROM reviews_applied_plan_changes p CROSS JOIN LATERAL jsonb_array_elements_text(p.removed_ids) r(value)
  JOIN marketing_location_access m ON m.customer_id=p.customer_id AND m.business_id=r.value::uuid AND NOT m.enabled
  WHERE p.customer_id NOT IN (SELECT customer_id FROM ended)
 ), links AS (
  UPDATE google_review_links l SET enabled=false,reconnected_to=l.business_id,sync_lock=NULL,sync_lock_until=NULL,settings_version=l.settings_version+1
  WHERE l.reconnected_to IS NULL AND (l.customer_id IN (SELECT customer_id FROM ended)
   OR (l.customer_id,l.business_id) IN (SELECT customer_id,business_id FROM removed))
  RETURNING l.business_id,l.customer_id,l.owner,(l.customer_id IN (SELECT customer_id FROM ended)) AS account_ended
 ), unscheduled AS (
  UPDATE google_live_reviews r SET scheduled_at=NULL FROM links WHERE r.business_id=links.business_id AND r.publish_state='idle' AND r.scheduled_at IS NOT NULL RETURNING r.id
 ), setup AS (
  UPDATE customers c SET marketing_onboarding_completed_at=NULL FROM (SELECT DISTINCT customer_id FROM links WHERE account_ended) x WHERE c.id=x.customer_id RETURNING c.id
 ) SELECT business_id,customer_id,owner,account_ended,(SELECT count(*)::int FROM unscheduled) AS unscheduled FROM links`;
 if(!released.length)return {released:0,removedLocations:0,connections:0,emailed:0};
 const owners=[...new Set(released.map(r=>String(r.owner)))];
 const removed=await sql`DELETE FROM google_business_connections g WHERE g.owner=ANY(${owners}::text[])
  AND NOT EXISTS(SELECT 1 FROM google_review_links l WHERE l.owner=g.owner AND l.reconnected_to IS NULL) RETURNING g.owner`;
 const endedAccounts=[...new Set(released.filter(r=>r.account_ended).map(r=>String(r.customer_id)))];
 let emailed=0;
 for(const account of endedAccounts){
  try{
   const results=await notifyReviewsAccessEnded({account,sql,send,env});
   if(results.some(r=>r.sent))emailed++;
  }catch{console.warn('Reviews ended email unavailable',{account});}
 }
 return {released:released.length,removedLocations:released.filter(r=>!r.account_ended).length,connections:removed.length,emailed};
}

/**
 * Tells the client their Google Reviews service has stopped, once, on the day it is released. ORDER_NOTIFICATION_EMAIL
 * gets a copy. Keyed by account and day, so a retry the same day sends nothing twice and a later resubscribe-and-end
 * still gets its own email.
 */
export async function notifyReviewsAccessEnded({account,sql=liveDb(),send=sendCommerceEmail,env=process.env,now=new Date()}:{account:string;sql?:Sql;send?:SendFn;env?:Record<string,string|undefined>;now?:Date}){
 const [customer]=await sql`SELECT c.email,c.name,c.first_name,
  (SELECT string_agg(b.business_name,', ' ORDER BY b.business_name) FROM businesses b JOIN google_review_links l ON l.business_id=b.id
    WHERE l.customer_id=c.id AND l.reconnected_to=l.business_id) AS businesses
  FROM customers c WHERE c.id=${account}::uuid`;
 if(!customer?.email)return [];
 const email=String(customer.email),name=String(customer.name||email);
 const firstName=String(customer.first_name||'').trim();
 const businesses=customer.businesses?String(customer.businesses):'';
 const site=(env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').replace(/\/$/,'');
 const day=now.toISOString().slice(0,10);
 const endDate=now.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'});
 const results:EmailResult[]=[];
 results.push(await send({to:email,from:getDefaultFromEmail(env),replyTo:getOrderReplyToEmail(env),subject:'Your Google Reviews subscription has ended',
  html:buildEmailHtml({eyebrow:'Google Reviews',title:'Your subscription has ended',
   intro:`${firstName?`Hi ${firstName}, `:''}your Google Reviews service ended on ${endDate}.`,
   body:[
    'Tap Rater no longer imports reviews or posts replies for you.',
    businesses?`${businesses} ${businesses.includes(',')?'have':'has'} been disconnected from Tap Rater, so you can connect ${businesses.includes(',')?'them':'it'} again any time.`:'Your Google locations have been disconnected from Tap Rater, so you can connect them again any time.',
    'Your reviews and drafts stay available in your account for 30 days.',
    "Want it back? Subscribe again and we'll guide you through reconnecting Google."
   ],
   cta:{label:'Subscribe again',url:`${site}/google-reviews#plan`}}),
  delivery:{messageType:'reviews_access_ended_customer',audience:'customer',entityType:'customer',entityId:account,retryable:true,idempotencyKey:`reviews_access_ended_customer:${account}:${day}`}}));
 const to=env.ORDER_NOTIFICATION_EMAIL?.trim();
 if(to){
  results.push(await send({to,from:getOrderFromEmail(env),replyTo:email,subject:`Ended: Google Reviews · ${name}`,
   html:buildEmailHtml({eyebrow:'Subscription ended',title:'Google Reviews access ended',
    intro:`${name}'s Google Reviews service ended and their Google locations were released.`,
    rows:{Customer:name,Email:email,Locations:businesses||'—','Ended on':endDate},
    cta:{label:'View subscriptions',url:`${site}/admin/subscriptions`}}),
   delivery:{messageType:'reviews_access_ended_admin',audience:'admin',entityType:'customer',entityId:account,retryable:true,idempotencyKey:`reviews_access_ended_admin:${account}:${day}`}}));
 }
 return results;
}
