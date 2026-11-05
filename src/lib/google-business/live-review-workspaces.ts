import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ReviewActor } from "../review-workspaces";
import { livePublishingEnabled, liveDb, LiveReviewError, ReviewAiWaitError, actorEmail, reviewStars, clientFor, authorizedLink } from "./live-review-core";

export async function listLiveWorkspaces(actor:ReviewActor,sql=liveDb(),locationIds:string[]|null=null,prioritizeDrafts=false) {
 const links=await sql`SELECT l.business_id,l.owner,l.title,l.enabled,l.synced_at,l.next_page,l.last_error,l.ai_consent,l.auto_enabled,l.auto_four,l.auto_five,l.auto_style,l.draft_low_stars,l.reply_delay_minutes,l.settings_version,l.draft_error,l.draft_checked_at,l.draft_due_at,l.consent_at,
 b.business_name, l.review_total,
 (l.initial_import_completed_at IS NOT NULL OR (l.synced_at IS NOT NULL AND l.next_page IS NULL) OR
  (l.review_total IS NOT NULL AND (SELECT count(*) FROM google_live_reviews r WHERE r.business_id=l.business_id)>=l.review_total)) AS initial_import_completed,
 (l.next_page IS NOT NULL OR l.sync_lock_until>now()) AS sync_in_progress,
 (SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=l.business_id) AS saved_count,
 (SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=l.business_id AND (l.sync_run IS NULL OR r.seen_run=l.sync_run)) AS imported_count, (g.owner IS NOT NULL) AS connected,
 (SELECT ai_monthly_limit FROM customer_marketing_access WHERE customer_id=b.customer_id) AS ai_monthly_limit,
 (SELECT coalesce(sum(units),0) FROM marketing_usage_reservations WHERE business_id=b.id AND service='ai' AND month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date) AS ai_monthly_used FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
 LEFT JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 WHERE b.customer_id=l.customer_id AND c.account_status='active' AND marketing_location_allowed(b.id) AND (${actor.kind==='admin'} OR lower(c.email)=${actorEmail(actor)}) AND (${locationIds===null} OR l.business_id=ANY(${locationIds ?? []}::uuid[])) ORDER BY b.business_name`;
 // One bounded batch replaces a network round trip for every authorized location.
 if(!links.length)return [];
 const rows=await sql`SELECT locations.business_id, page.*
 FROM unnest(${links.map(link=>link.business_id)}::uuid[]) AS locations(business_id)
 CROSS JOIN LATERAL (
  SELECT id,data,draft,version,publish_state,attempted_at,approved_version,suspected_spam,scheduled_at,policy_check,old_reply_requested_at,auto_schedule_cancelled,draft_generated_at
  FROM google_live_reviews WHERE business_id=locations.business_id AND fetched_at>now()-interval '30 days'
  ORDER BY CASE WHEN ${prioritizeDrafts} AND NOT suspected_spam AND draft<>'' AND publish_state<>'published' AND approved_version IS DISTINCT FROM version THEN 0 ELSE 1 END,data->>'updateTime' DESC,id LIMIT 101
 ) page ORDER BY locations.business_id,CASE WHEN ${prioritizeDrafts} AND NOT page.suspected_spam AND page.draft<>'' AND page.publish_state<>'published' AND page.approved_version IS DISTINCT FROM page.version THEN 0 ELSE 1 END,page.data->>'updateTime' DESC,page.id`;
 const grouped=new Map<string,typeof rows>();
 for(const {business_id,...review} of rows){
  const reviews=grouped.get(business_id) || [];
  reviews.push(review);grouped.set(business_id,reviews);
 }
 return links.map(link=>{
  const reviews=grouped.get(link.business_id) || [];
  return {...link,draft_error:link.draft_error&&link.ai_monthly_limit!=null&&Number(link.ai_monthly_used)>=Number(link.ai_monthly_limit)?new ReviewAiWaitError('monthly').message:link.draft_error,reviews:reviews.slice(0,100),moreReviews:reviews.length>100};
 });
}

export async function liveReviewPage(actor:ReviewActor,businessId:string,offset:number,sql=liveDb(),prioritizeDrafts=false){
 await authorizedLink(actor,businessId,sql);
 const rows=await sql`SELECT id,data,draft,version,publish_state,attempted_at,approved_version,suspected_spam,scheduled_at,policy_check,old_reply_requested_at,auto_schedule_cancelled,draft_generated_at FROM google_live_reviews WHERE business_id=${businessId} AND fetched_at>now()-interval '30 days' ORDER BY CASE WHEN ${prioritizeDrafts} AND NOT suspected_spam AND draft<>'' AND publish_state<>'published' AND approved_version IS DISTINCT FROM version THEN 0 ELSE 1 END,data->>'updateTime' DESC,id LIMIT 101 OFFSET ${offset}`;
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
 const rows=await sql`WITH linked AS (INSERT INTO google_review_links (business_id,customer_id,owner,google_subject,parent,title,ai_consent,auto_enabled,auto_four,auto_five,draft_low_stars,consent_at,review_total)
 VALUES (${businessId},${businesses[0].customer_id},${owner},${connections[0].google_subject},${parent},${title},true,true,true,true,true,now(),${preview.totalReviewCount??null}) ON CONFLICT (business_id) DO UPDATE SET owner=EXCLUDED.owner,google_subject=EXCLUDED.google_subject,enabled=true,ai_consent=true,auto_enabled=true,auto_four=true,auto_five=true,draft_low_stars=true,consent_at=now(),settings_version=google_review_links.settings_version+1 WHERE NOT google_review_links.enabled AND google_review_links.customer_id=EXCLUDED.customer_id AND google_review_links.parent=EXCLUDED.parent RETURNING business_id), named AS (UPDATE businesses b SET business_name=${title},address=${selectedAddress},google_place_id=NULL,google_review_url=NULL FROM linked l,customers c WHERE b.id=l.business_id AND b.customer_id=c.id AND c.marketing_onboarding_business_id=b.id AND c.marketing_onboarding_completed_at IS NULL RETURNING b.id) SELECT business_id FROM linked`;
 if(!rows.length)throw new LiveReviewError('This customer workspace or Google location is already assigned. Stop and remove its previous assignment first.');
 return {linked:true};
}

export async function syncLiveReviews(actor:ReviewActor,businessId:string,sql=liveDb(),makeClient=clientFor,force=false){
 const link=await authorizedLink(actor,businessId,sql);if(!link.enabled)throw new LiveReviewError('Google review access is stopped.');
 // Completed runs have a server-enforced cooldown, including stale browser requests.
 if(!force&&!link.next_page&&link.synced_at&&Date.now()-new Date(link.synced_at).getTime()<15*60*1000)return {imported:0,more:false};
 const lock=randomUUID();
 const claims=await sql`UPDATE google_review_links SET sync_lock=${lock},sync_lock_until=now()+interval '3 minutes',checked_at=now()
 WHERE business_id=${businessId} AND enabled AND (sync_lock_until IS NULL OR sync_lock_until<now())
 AND (checked_at IS NULL OR checked_at<now()-interval '10 seconds')
 AND (${force} OR next_page IS NOT NULL OR synced_at IS NULL OR synced_at<now()-interval '15 minutes')
 AND customer_id=${link.customer_id} AND owner=${link.owner} AND parent=${link.parent} AND google_subject=${link.google_subject}
 RETURNING business_id,next_page,sync_run`;
 if(!claims.length)throw new LiveReviewError('A sync is running or was just requested. Please wait briefly.');
 try{
  // Read the cursor from the atomic claim, never the earlier authorization snapshot.
  const run=claims[0].sync_run || randomUUID();
  const client=await makeClient(String(link.owner));const page=await client.listReviews(String(link.parent),claims[0].next_page || undefined);
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
  await sql`UPDATE google_review_links SET review_total=${page.totalReviewCount??null},next_page=${page.nextPageToken || null},sync_run=${page.nextPageToken?run:null},synced_at=now(),last_error=NULL,
   initial_import_completed_at=CASE WHEN ${!page.nextPageToken} THEN coalesce(initial_import_completed_at,now()) ELSE initial_import_completed_at END,
   maintenance_due_at=now()+CASE WHEN ${Boolean(page.nextPageToken)} THEN interval '1 minute' ELSE interval '15 minutes' END
   WHERE business_id=${businessId} AND sync_lock=${lock}`;
  return {imported:page.reviews.length,more:Boolean(page.nextPageToken)};
 }catch(error){await sql`UPDATE google_review_links SET last_error='Sync failed. Reconnect Google or check API access and quota.' WHERE business_id=${businessId} AND sync_lock=${lock}`;throw error;}
 finally{await sql`UPDATE google_review_links SET sync_lock=NULL,sync_lock_until=NULL WHERE business_id=${businessId} AND sync_lock=${lock}`;}
}

export const liveSettingsSchema=z.object({businessId:z.string().uuid(),aiConsent:z.boolean(),autoEnabled:z.boolean(),four:z.boolean(),five:z.boolean(),style:z.enum(['friendly','professional','personal','short']),version:z.number().int().positive(),confirmAutomaticPosting:z.boolean(),lowStars:z.boolean().optional(),delayMinutes:z.union([z.literal(5),z.literal(20),z.literal(60),z.literal(120),z.literal(360),z.literal(1440)]).optional()}).strict();

export async function saveLiveSettings(actor:ReviewActor,input:z.infer<typeof liveSettingsSchema>,sql=liveDb()){
 const v=liveSettingsSchema.parse(input);const settingsLink=await authorizedLink(actor,v.businessId,sql);
 if(v.autoEnabled && (!livePublishingEnabled() || !v.aiConsent || !v.confirmAutomaticPosting || (!v.four&&!v.five)))throw new LiveReviewError('Live publishing must be activated, AI allowed, and automatic posting expressly confirmed for selected ratings.');
 const rows=await sql`UPDATE google_review_links SET draft_low_stars=${v.lowStars??settingsLink.draft_low_stars??true},ai_consent=${v.aiConsent},auto_enabled=${v.autoEnabled},auto_four=${v.four},auto_five=${v.five},auto_style=${v.style},reply_delay_minutes=${v.delayMinutes??settingsLink.reply_delay_minutes??5},
 consent_at=CASE WHEN ${v.autoEnabled} THEN CASE WHEN auto_enabled AND auto_four=${v.four} AND auto_five=${v.five} THEN consent_at ELSE now() END ELSE NULL END,settings_version=settings_version+1
 WHERE business_id=${v.businessId} AND customer_id=${settingsLink.customer_id} AND parent=${settingsLink.parent} AND google_subject=${settingsLink.google_subject} AND enabled AND settings_version=${v.version} RETURNING settings_version`;
 if(!rows.length)throw new LiveReviewError('Settings changed. Reload and try again.');
 await sql`UPDATE google_live_reviews r SET scheduled_at=NULL,old_reply_requested_at=NULL FROM google_review_links l WHERE r.business_id=l.business_id AND l.business_id=${v.businessId} AND (NOT l.auto_enabled OR NOT l.ai_consent OR (r.scheduled_at IS NOT NULL AND r.schedule_consent_at IS DISTINCT FROM l.consent_at) OR (r.data->>'starRating'='FOUR' AND NOT l.auto_four) OR (r.data->>'starRating'='FIVE' AND NOT l.auto_five))`;return rows[0];
}

const replyDelaySchema=z.union([z.literal(5),z.literal(20),z.literal(60),z.literal(120),z.literal(360),z.literal(1440)]);
export async function updateReviewReplyDelay(actor:ReviewActor,businessId:string,delayMinutes:number,sql=liveDb()){
 const delay=replyDelaySchema.parse(delayMinutes);
 await authorizedLink(actor,businessId,sql);
 const updated=await sql`UPDATE google_review_links SET reply_delay_minutes=${delay},settings_version=settings_version+1,draft_due_at=LEAST(draft_due_at,now())
  WHERE business_id=${businessId} AND enabled AND ai_consent RETURNING business_id,reply_delay_minutes`;
 if(!updated.length)throw new LiveReviewError('Reply timing can only be changed for an active Google Reviews location with AI replies enabled.');
 const rescheduled=await sql`UPDATE google_live_reviews r SET scheduled_at=greatest(now(),coalesce(r.draft_generated_at,r.created_at,now())+${delay}*interval '1 minute')
  FROM google_review_links l WHERE r.business_id=${businessId} AND l.business_id=r.business_id AND r.scheduled_at IS NOT NULL
  AND r.publish_state='idle' AND NOT r.auto_schedule_cancelled AND NOT r.suspected_spam AND r.approved_version IS NULL
  AND r.scheduled_version=r.version AND r.schedule_consent_at=l.consent_at AND coalesce(r.data->'reviewReply'->>'comment','')=''
  RETURNING r.id`;
 return {businessId,replyDelayMinutes:delay,rescheduled:rescheduled.length};
}

export async function stopLiveReviews(actor:ReviewActor,businessId:string,sql=liveDb()){
 // Stopping must remain possible after Google revokes the connection.
 const rows=await sql`UPDATE google_review_links l SET enabled=false,auto_enabled=false,ai_consent=false,profile_ai_enabled=false,settings_version=settings_version+1
 FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE l.business_id=${businessId} AND b.id=l.business_id AND b.customer_id=l.customer_id
 AND (${actor.kind==='admin'} OR (lower(c.email)=${actorEmail(actor)} AND c.account_status='active')) RETURNING l.business_id`;
 if(!rows.length)throw new LiveReviewError('Workspace unavailable.',404);return {stopped:true};
}

export async function olderReviews(actor:ReviewActor,businessId:string,confirm=false,sql=liveDb()){
 const link=await authorizedLink(actor,businessId,sql);
 if(!link.enabled||!link.ai_consent)throw new LiveReviewError('Enable AI replies for this location first.');
 const rows=await sql`SELECT id,data,draft,draft_generated_at FROM google_live_reviews WHERE business_id=${businessId} AND (${Boolean(link.draft_low_stars)} OR data->>'starRating' NOT IN ('ONE','TWO','THREE')) AND NOT suspected_spam AND publish_state='idle' AND coalesce(data->'reviewReply'->>'comment','')='' AND fetched_at>now()-interval '30 days' AND scheduled_at IS NULL AND old_reply_requested_at IS NULL AND draft='' AND NULLIF(data->>'createTime','')::timestamptz<=coalesce(${link.consent_at||null}::timestamptz,now()) ORDER BY created_at LIMIT 5000`;
 const automatic=rows.filter(r=>link.auto_enabled&&((reviewStars(r.data)===4&&link.auto_four)||(reviewStars(r.data)===5&&link.auto_five))).length;
 if(confirm){
 await sql`UPDATE google_live_reviews SET old_reply_requested_at=now() WHERE business_id=${businessId} AND id=ANY(${rows.map(r=>String(r.id))}::uuid[]) AND draft='' AND publish_state='idle' AND NOT suspected_spam AND coalesce(data->'reviewReply'->>'comment','')=''`;
 await sql`UPDATE google_review_links SET maintenance_due_at=now() WHERE business_id=${businessId}`;
 }
 return {total:rows.length,scheduled:automatic,drafts:rows.length-automatic,queued:confirm,delayMinutes:link.reply_delay_minutes??5};
}
