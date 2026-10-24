import {liveDb} from './google-business/live-reviews';
import {workerCatalog} from './worker-observation';
export function workerState(row:Record<string,any>|undefined,minutes:number,now=Date.now()){
 if(!row)return 'Not observed';
 if(row.status==='failed')return 'Failed';
 if(now-new Date(row.started_at).getTime()>Math.max(5,minutes*2)*60000)return 'Overdue';
 return row.status==='running'?'Running':'Reporting';
}
export function locationHealth(row:Record<string,any>,now=Date.now()){
 const reasons:string[]=[];
 if(row.enabled){
  if(!row.connected)reasons.push('Google reconnect needed');
  if(!row.licensed)reasons.push('Service access blocked');
  if(row.import_error)reasons.push('Import retry needed');
  if(row.draft_error)reasons.push('Draft generation waiting / retry');
  if(Number(row.uncertain)>0)reasons.push('Publish result needs review');
  if(Number(row.alerts)>0)reasons.push('Worker failures');
  if(row.synced_at&&now-new Date(row.synced_at).getTime()>45*60000)reasons.push('Import overdue');
  if(!row.synced_at)reasons.push('First import pending');
  if(row.ai_consent&&row.draft_due_at&&now-new Date(row.draft_due_at).getTime()>15*60000)reasons.push('Draft worker overdue');
 }
 if(Number(row.profile_errors)>0)reasons.push('Profile draft failures');
 if(Number(row.scan_errors)>0)reasons.push('Heat-map points need attention');
 return {status:reasons.length?'Needs attention':row.enabled?'Reporting':'Not connected',reasons};
}
export async function adminWorkerHealth(sql=liveDb()){
 const [workers,accounts,locations,integrations]=await Promise.all([
  sql`SELECT name,started_at,finished_at,succeeded_at,status,failures,metrics FROM system_worker_health`,
  sql`SELECT c.id,coalesce(nullif(c.name,''),'Unnamed account') AS name,c.email,c.account_status,
    ma.status AS licence_status,ma.expires_at,ma.unlimited_locations,ma.location_limit,ma.ai_monthly_limit,
    (SELECT coalesce(sum(u.units),0) FROM marketing_usage_reservations u WHERE u.customer_id=c.id AND u.service='ai' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date) AS ai_used,
    (SELECT count(*) FROM email_deliveries e WHERE lower(e.recipient)=lower(c.email) AND e.status IN ('failed','bounced') AND e.created_at>now()-interval '7 days') AS email_failures
    FROM customers c LEFT JOIN customer_marketing_access ma ON ma.customer_id=c.id WHERE c.account_status<>'guest' ORDER BY c.created_at DESC`,
  sql`SELECT b.id,b.customer_id,b.business_name AS name,l.enabled,l.ai_consent,l.auto_enabled,l.auto_four,l.auto_five,l.profile_ai_enabled,l.draft_low_stars,l.reply_delay_minutes,
    l.synced_at,l.checked_at,l.maintenance_due_at,l.draft_checked_at,l.draft_due_at,l.review_total,
    nullif(l.last_error,'') IS NOT NULL AS import_error,nullif(l.draft_error,'') IS NOT NULL AS draft_error,
    EXISTS(SELECT 1 FROM google_business_connections g WHERE g.owner=l.owner AND g.google_subject=l.google_subject) AS connected,
    (SELECT g.email FROM google_business_connections g WHERE g.owner=l.owner AND g.google_subject=l.google_subject) AS google_email,
    (SELECT coalesce(sum(u.units),0) FROM marketing_usage_reservations u WHERE u.business_id=b.id AND u.service='ai' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date) AS monthly_ai_used,
    marketing_location_allowed(b.id) AS licensed,
    (SELECT count(*) FROM unnest(l.ai_hour_reservations) AS t WHERE t>now()-interval '1 hour') AS ai_hour_used,
    r.*,a.alerts,a.last_failure,a.email_sent,a.alert_stages,p.profile_checked,p.profile_drafts,p.profile_errors,
    s.enabled AS heatmap_enabled,s.cadence,h.scan_at,h.scan_pending,h.scan_errors
    FROM businesses b LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=b.customer_id
    LEFT JOIN LATERAL (SELECT count(*) AS imported,
      count(*) FILTER(WHERE coalesce(data->'reviewReply'->>'comment','')<>'' OR publish_state='published') AS answered,
      count(*) FILTER(WHERE data->>'starRating' IN ('FOUR','FIVE') AND (coalesce(data->'reviewReply'->>'comment','')<>'' OR publish_state='published')) AS positive_answered,
      count(*) FILTER(WHERE old_reply_requested_at IS NOT NULL AND publish_state='published') AS old_auto_answered,
      count(*) FILTER(WHERE coalesce(data->'reviewReply'->>'comment','')='' AND publish_state='idle' AND scheduled_at IS NOT NULL AND NOT suspected_spam AND NOT auto_schedule_cancelled) AS queued,
      count(*) FILTER(WHERE coalesce(data->'reviewReply'->>'comment','')='' AND publish_state='idle' AND scheduled_at IS NULL AND old_reply_requested_at IS NOT NULL AND draft='' AND NOT suspected_spam AND NOT auto_schedule_cancelled) AS waiting,
      count(*) FILTER(WHERE draft<>'' AND publish_state='idle' AND scheduled_at IS NULL) AS manual_drafts,
      count(*) FILTER(WHERE publish_state='uncertain') AS uncertain,
      min(scheduled_at) FILTER(WHERE publish_state='idle' AND NOT suspected_spam AND NOT auto_schedule_cancelled) AS next_reply
      FROM google_live_reviews r WHERE r.business_id=b.id) r ON true
    LEFT JOIN LATERAL (SELECT string_agg(stage || ': ' || failures::text, ', ' ORDER BY stage) AS alert_stages,count(*) AS alerts,max(updated_at) AS last_failure,max(emailed_at) AS email_sent FROM review_worker_alerts a WHERE a.business_id=b.id AND a.resolved_at IS NULL) a ON true
    LEFT JOIN LATERAL (SELECT max(i.updated_at) AS profile_checked,count(d.id) FILTER(WHERE d.status<>'failed') AS profile_drafts,count(d.id) FILTER(WHERE d.status='failed') AS profile_errors FROM local_issues i LEFT JOIN local_issue_drafts d ON d.issue_id=i.id AND d.fingerprint=i.fingerprint WHERE i.business_id=b.id AND i.customer_id=b.customer_id AND i.active AND i.finding->>'kind'='profile') p ON true
    LEFT JOIN local_rank_schedules s ON s.business_id=b.id AND s.customer_id=b.customer_id
    LEFT JOIN LATERAL (SELECT max(r.created_at) AS scan_at,count(p.id) FILTER(WHERE p.state IN ('queued','pending','submitting')) AS scan_pending,count(p.id) FILTER(WHERE p.state IN ('failed','uncertain')) AS scan_errors FROM local_rank_runs r LEFT JOIN local_rank_points p ON p.run_id=r.id WHERE r.business_id=b.id AND r.customer_id=b.customer_id AND r.created_at>now()-interval '30 days') h ON true
    WHERE EXISTS(SELECT 1 FROM customers c WHERE c.id=b.customer_id AND c.account_status<>'guest')
    ORDER BY b.business_name,b.id`,
  sql`SELECT (SELECT enabled FROM local_rank_provider WHERE id=true) AS heatmap_provider_enabled,
    (SELECT max(processed_at) FROM stripe_events) AS stripe_last_processed,
    (SELECT max(delivered_at) FROM email_deliveries) AS email_last_delivered,
    (SELECT count(*) FROM email_deliveries WHERE status IN ('failed','bounced') AND created_at>now()-interval '24 hours') AS email_failures`
 ]);
 const checkedAt=new Date().toISOString();
 return {checkedAt,workers:workerCatalog.map((w):Record<string,any>&{name:string;label:string;minutes:number;health:string}=>({...w,...workers.find(r=>r.name===w.name),health:workerState(workers.find(r=>r.name===w.name),w.minutes)})),accounts,locations:locations.map((l):Record<string,any>&{status:string;reasons:string[]}=>({...l,...locationHealth(l)})),integrations:integrations[0]};
}
export type WorkerHealthData=Awaited<ReturnType<typeof adminWorkerHealth>>;
