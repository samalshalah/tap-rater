import type {NeonQueryFunction} from '@neondatabase/serverless';
import {sendEmail,buildEmailHtml,getCustomerReplyToEmail} from './email';
type Sql=NeonQueryFunction<false,false>;
export async function reviewWorkerFailure(sql:Sql,businessId:string,stage:'import'|'draft'|'publish',immediate=false){
 const [row]=await sql`INSERT INTO review_worker_alerts(business_id,stage,failures) VALUES(${businessId},${stage},${immediate?3:1}) ON CONFLICT(business_id,stage) DO UPDATE SET failures=CASE WHEN review_worker_alerts.resolved_at IS NOT NULL THEN ${immediate?3:1} ELSE review_worker_alerts.failures+1 END,resolved_at=NULL,updated_at=now() RETURNING failures`;
 return Number(row?.failures||1);
}
export async function resolveReviewWorkerAlert(sql:Sql,businessId:string,stage:string){await sql`UPDATE review_worker_alerts SET resolved_at=now(),failures=0 WHERE business_id=${businessId} AND stage=${stage} AND resolved_at IS NULL`;}
export async function sendReviewWorkerAlerts(sql:Sql,send=sendEmail){
 const recipient=process.env.SUPPORT_ALERT_EMAIL||getCustomerReplyToEmail();
 const rows=await sql`WITH due AS (SELECT business_id,stage FROM review_worker_alerts WHERE resolved_at IS NULL AND failures>=3 AND (emailed_at IS NULL OR emailed_at<now()-interval '24 hours') AND (email_attempt_at IS NULL OR email_attempt_at<now()-interval '15 minutes') LIMIT 20 FOR UPDATE SKIP LOCKED) UPDATE review_worker_alerts a SET email_attempt_at=now() FROM due WHERE a.business_id=due.business_id AND a.stage=due.stage RETURNING a.business_id,a.stage,a.failures`;
 if(!rows.length)return;
 const result=await send({to:recipient,subject:'Tap Rater review worker needs attention',html:buildEmailHtml({title:'Review automation needs attention',body:rows.map(r=>`Location ${r.business_id}: ${r.stage} failed ${r.failures} times.`),cta:{label:'View worker alerts',url:'https://taprater.com/admin/ai-agent'}})});
 if(result.sent)for(const row of rows)await sql`UPDATE review_worker_alerts SET emailed_at=now() WHERE business_id=${row.business_id} AND stage=${row.stage}`;
}
