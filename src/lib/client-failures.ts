import {businessOptimizationEnabled} from './business-optimization-feature';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {sendEmail,buildEmailHtml,getCustomerReplyToEmail} from './email';
const db=()=>neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
export const supportAlertRecipient=()=>process.env.SUPPORT_ALERT_EMAIL||getCustomerReplyToEmail();
export function failurePath(value:string){
 try {const path=new URL(value,'https://taprater.com').pathname;
  if(!/^(?:\/account|\/api\/(?:account|activate|checkout|forms|landing-pages|media|setup|site))(?:\/|$)/.test(path))return '/account';
  return path.split('/').map(p=>/^[a-z-]{1,40}$/.test(p)?p:p?'[id]':'').join('/').slice(0,180);
 }catch{return '/account';}
}
export type ClientFailure={customerId?:string;businessId?:string;source:'request'|'browser'|'background';code:string;path:string;status?:number};
export async function recordClientFailure(input:ClientFailure,sql=db()){
 const path=input.source==='background'?'/admin/workers':failurePath(input.path);
 const code=input.code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
 const fingerprint=createHash('sha256').update([input.customerId||'',input.businessId||'',input.source,code,path,input.status||''].join('|')).digest('hex');
 await sql`INSERT INTO client_failures(fingerprint,customer_id,business_id,source,code,path,http_status)
 VALUES(${fingerprint},${input.customerId||null},${input.businessId||null},${input.source},${code},${path},${input.status||null})
 ON CONFLICT(fingerprint) DO UPDATE SET occurrences=client_failures.occurrences+1,last_seen=now(),resolved_at=NULL`;
}
export async function sendClientFailureAlerts(sql=db(),send=sendEmail){
 const rows=await sql`WITH due AS (SELECT id FROM client_failures WHERE resolved_at IS NULL AND (notified_at IS NULL OR (last_seen>notified_at AND notified_at<now()-interval '24 hours')) AND (notification_attempt_at IS NULL OR notification_attempt_at<now()-interval '15 minutes') ORDER BY first_seen LIMIT 30 FOR UPDATE SKIP LOCKED)
 UPDATE client_failures f SET notification_attempt_at=now() FROM due WHERE f.id=due.id RETURNING f.*`;
 if(!rows.length)return {sent:0};
 // Reuse the claimed time bucket on retries to reduce duplicate provider deliveries.
 const key='client-failures-'+createHash('sha256').update(rows.map(r=>r.id+':'+(r.notified_at||'first')).sort().join('|')).digest('hex');
 let result;try{result=await send({to:supportAlertRecipient(),subject:`Tap Rater: ${rows.length} client failures need attention`,html:buildEmailHtml({title:'Client failures need attention',body:rows.map(r=>`${r.code} · ${r.path} · HTTP ${r.http_status||'n/a'} · ${r.occurrences} observations · Account ${r.customer_id||'unavailable'} · Location ${r.business_id||'not specified'}`),cta:{label:'View client failures',url:'https://taprater.com/admin/client-failures'}}),delivery:{messageType:'client_failure_alert',audience:'internal',idempotencyKey:key}});}catch{result={sent:false as const,reason:'send_exception'};}
 for(const row of rows)await sql`UPDATE client_failures SET notified_at=CASE WHEN ${result.sent} THEN now() ELSE notified_at END,notification_error=${result.sent?null:'Support email failed; queued for retry'} WHERE id=${row.id}`;
 return {sent:result.sent?rows.length:0};
}
export async function collectBackgroundFailures(sql=db()){
 const rows=await sql`WITH draft_state AS (
 SELECT b.customer_id,b.id AS business_id,l.draft_error,marketing_location_allowed(b.id) AS allowed,
 (SELECT coalesce(sum(u.units),0) FROM marketing_usage_reservations u WHERE u.business_id=b.id AND u.service='ai' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date)>=a.ai_monthly_limit AS exhausted,
 (l.draft_error LIKE 'Draft generation is queued%' OR l.draft_error LIKE 'Monthly AI allowance exhausted.%') AS waiting
 FROM google_review_links l JOIN businesses b ON b.id=l.business_id LEFT JOIN customer_marketing_access a ON a.customer_id=b.customer_id WHERE l.enabled AND l.ai_consent
 ) SELECT b.customer_id,b.id AS business_id,'review_import' AS code FROM google_review_links l JOIN businesses b ON b.id=l.business_id WHERE l.enabled AND nullif(l.last_error,'') IS NOT NULL
 UNION SELECT customer_id,business_id,CASE WHEN NOT allowed THEN 'review_access_unavailable' WHEN exhausted THEN 'review_ai_allowance' ELSE 'review_draft' END
 FROM draft_state WHERE nullif(draft_error,'') IS NOT NULL AND (NOT allowed OR exhausted OR NOT waiting)
 UNION SELECT b.customer_id,r.business_id,'review_publish_uncertain' FROM google_live_reviews r JOIN businesses b ON b.id=r.business_id WHERE r.publish_state='uncertain'
 UNION SELECT b.customer_id,a.business_id,CASE WHEN a.stage='publish' THEN 'review_publish_uncertain' ELSE 'review_'||a.stage END FROM review_worker_alerts a JOIN businesses b ON b.id=a.business_id WHERE a.resolved_at IS NULL AND (a.stage='publish' OR (b.status IS DISTINCT FROM 'marketing_removed' AND EXISTS(SELECT 1 FROM google_review_links running WHERE running.business_id=b.id AND running.enabled AND (a.stage<>'draft' OR running.ai_consent)))) AND a.failures>=3 AND (a.stage<>'draft' OR NOT EXISTS(SELECT 1 FROM draft_state d WHERE d.business_id=a.business_id AND (NOT d.allowed OR d.exhausted OR d.waiting)))
 UNION SELECT r.customer_id,r.business_id,'heatmap_result' FROM local_rank_runs r JOIN local_rank_points p ON p.run_id=r.id WHERE p.state IN ('error','failed','uncertain') AND r.created_at>now()-interval '30 days'
 UNION SELECT i.customer_id,i.business_id,'profile_draft' FROM local_issues i JOIN local_issue_drafts d ON d.issue_id=i.id AND d.fingerprint=i.fingerprint WHERE ${businessOptimizationEnabled} AND i.active AND d.status='failed'
 UNION SELECT NULL::uuid,NULL::uuid,'worker_'||name FROM system_worker_health WHERE status='failed'
 UNION SELECT NULL::uuid,NULL::uuid,'heatmap_provider_hold' FROM local_rank_provider WHERE halt_reason IS NOT NULL
 UNION SELECT NULL::uuid,NULL::uuid,'email_delivery' FROM email_deliveries WHERE status IN ('failed','bounced') AND created_at>now()-interval '24 hours' AND message_type IS DISTINCT FROM 'client_failure_alert'`;
 for(const row of rows)await recordClientFailure({customerId:row.customer_id,businessId:row.business_id,source:'background',code:row.code,path:'/admin/workers'},sql);
 // Only background health has an authoritative recovery signal. Request failures remain in history.
 await sql`UPDATE client_failures SET resolved_at=now() WHERE source='background' AND resolved_at IS NULL AND last_seen<now()-interval '6 minutes'`;
 return {observed:rows.length};
}
