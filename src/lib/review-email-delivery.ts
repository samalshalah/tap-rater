import {randomUUID} from 'node:crypto';
import {liveDb} from './google-business/live-review-core';
import {buildEmailHtml,sendEmail} from './email';

export async function enqueueReviewReports(sql=liveDb(),at=new Date()){
 await sql`WITH schedules AS (
   SELECT p.*,s.kind,date_trunc(s.kind,${at.toISOString()}::timestamptz AT TIME ZONE p.zone)::date AS period_end,
          CASE s.kind WHEN 'week' THEN interval '1 week' ELSE interval '1 month' END AS span
   FROM review_email_preferences p JOIN google_review_links l ON l.business_id=p.business_id AND l.customer_id=p.customer_id
   CROSS JOIN (VALUES ('week'),('month')) s(kind)
   WHERE l.enabled AND marketing_location_allowed(l.business_id) AND ((s.kind='week' AND p.weekly) OR (s.kind='month' AND p.monthly))
 ), periods AS (SELECT *, (period_end+make_interval(hours=>delivery_hour)) AT TIME ZONE zone AS due FROM schedules)
 INSERT INTO review_email_queue(business_id,customer_id,pref_version,kind,event_key,due_at,period_start,period_end,previous_start)
 SELECT business_id,customer_id,version,kind,period_end::text,due,
 (period_end-span) AT TIME ZONE zone,period_end::timestamp AT TIME ZONE zone,(period_end-2*span) AT TIME ZONE zone
 FROM periods WHERE due>changed_at AND due<=${at.toISOString()}::timestamptz ON CONFLICT DO NOTHING`;
}

type Job={id:string;business_id:string;business_name:string;email:string;kind:string;event_key:string;rating:number;low_count:number;high_count:number;
 period_start:string;period_end:string;previous_start:string;zone:string;attempts:number;message:{subject:string;html:string}|null};
async function compose(job:Job,sql:ReturnType<typeof liveDb>){
 const report=job.kind==='month'||job.kind==='week';
 const title=report?(job.kind==='month'?'Monthly review report':'Weekly review report'):job.kind==='daily'?'Your daily review digest':'New '+job.rating+'-star Google review';
 const rows:Record<string,string|number>={};
 if(report){
  const [s]=await sql`WITH reviews AS (
    SELECT (data->>'createTime')::timestamptz AS written,
      array_position(ARRAY['ONE','TWO','THREE','FOUR','FIVE'],data->>'starRating') AS stars,
      publish_state='published' AND attempted_reply=data->'reviewReply'->>'comment' AS confirmed,
      attempted_at, draft, coalesce(data->'reviewReply'->>'comment','')='' AS unanswered
    FROM google_live_reviews WHERE business_id=${job.business_id}
  ) SELECT count(*) FILTER(WHERE written>=${job.period_start} AND written<${job.period_end}) AS new_count,
    count(*) FILTER(WHERE written>=${job.previous_start} AND written<${job.period_start}) AS previous_count,
    round(avg(stars) FILTER(WHERE written>=${job.period_start} AND written<${job.period_end}),1) AS average,
    count(*) FILTER(WHERE written>=${job.period_start} AND written<${job.period_end} AND NOT unanswered) AS answered,
    count(*) FILTER(WHERE confirmed AND attempted_at>=${job.period_start} AND attempted_at<${job.period_end} AND written>=${job.period_start}) AS posted_new,
    count(*) FILTER(WHERE confirmed AND attempted_at>=${job.period_start} AND attempted_at<${job.period_end} AND written<${job.period_start}) AS posted_old,
    count(*) FILTER(WHERE stars<=3 AND draft<>'' AND unanswered) AS private_drafts FROM reviews`;
  const format=new Intl.DateTimeFormat('en-US',{timeZone:job.zone,month:'short',day:'numeric',year:'numeric'});
  rows['Period']=format.format(new Date(job.period_start))+' – '+format.format(new Date(new Date(job.period_end).getTime()-1));
  rows['New Google reviews']=s.new_count;rows['Previous period']=s.previous_count;rows['Average new rating']=s.average??'No new ratings';
  if(Number(s.new_count)>0)rows['New reviews with a Google reply']=Math.round(100*Number(s.answered)/Number(s.new_count))+'%';
  rows['Replies posted to new reviews']=s.posted_new;rows['Replies posted to older reviews']=s.posted_old;rows['Low-star drafts awaiting your review now']=s.private_drafts;
 }else if(job.kind==='daily'){
  rows['New 1–3-star reviews']=job.low_count;rows['New 4–5-star reviews']=job.high_count;
 }else{
  rows['Rating']=job.rating+' out of 5';
  const [review]=await sql`SELECT left(data->>'comment',320) AS excerpt FROM google_live_reviews
    WHERE business_id=${job.business_id} AND resource=${job.event_key}`;
  if(review?.excerpt)rows['Review excerpt']=review.excerpt;
 }
 const suffix='?location='+encodeURIComponent(job.business_id);
 return {subject:title+' · '+job.business_name,html:buildEmailHtml({title,intro:job.business_name,rows,
 cta:{label:'Open reviews',url:'https://taprater.com/account/reviews'+suffix},
 body:['Notification settings: https://taprater.com/account/notifications'+suffix]})};
}

export async function deliverReviewEmails(sql=liveDb(),send=sendEmail){
 const token=randomUUID();
 const jobs=await sql`WITH due AS (
   SELECT q.id FROM review_email_queue q JOIN review_email_preferences p ON p.business_id=q.business_id AND p.customer_id=q.customer_id AND p.version=q.pref_version
   JOIN google_review_links l ON l.business_id=q.business_id AND l.customer_id=q.customer_id
   WHERE q.finished_at IS NULL AND q.due_at<=now() AND (q.retry_at IS NULL OR q.retry_at<=now())
     AND q.attempts<6 AND (q.first_attempt IS NULL OR q.first_attempt>now()-interval '23 hours')
     AND l.enabled AND marketing_location_allowed(l.business_id) ORDER BY q.due_at,q.id LIMIT 12 FOR UPDATE OF q SKIP LOCKED
 ) UPDATE review_email_queue q SET claim=${token}::uuid,retry_at=now()+interval '10 minutes',
 first_attempt=coalesce(first_attempt,now()),attempts=attempts+1 FROM due WHERE q.id=due.id RETURNING q.id`;
 let sent=0,failed=0;
 for(const {id} of jobs){
  try{
   const [job]=await sql`SELECT q.*,b.business_name,c.email,p.zone FROM review_email_queue q
    JOIN review_email_preferences p ON p.business_id=q.business_id AND p.customer_id=q.customer_id AND p.version=q.pref_version
    JOIN businesses b ON b.id=q.business_id AND b.customer_id=q.customer_id
    JOIN customers c ON c.id=b.customer_id JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=c.id
    WHERE q.id=${id} AND q.claim=${token}::uuid AND l.enabled AND marketing_location_allowed(b.id) AND c.account_status='active'`;
   if(!job)continue;
   const message=job.message||await compose(job as Job,sql);
   const frozen=await sql`UPDATE review_email_queue q SET message=coalesce(message,${JSON.stringify(message)}::jsonb) FROM review_email_preferences p
    WHERE q.id=${id} AND q.claim=${token}::uuid AND q.business_id=p.business_id AND q.customer_id=p.customer_id AND q.pref_version=p.version
    AND marketing_location_allowed(p.business_id) RETURNING q.message`;
   if(!frozen.length)continue;
   const result=await send({to:job.email,subject:frozen[0].message.subject,html:frozen[0].message.html,
    delivery:{messageType:'review_notification_'+job.kind,audience:'customer',entityType:'review_notification',entityId:id,idempotencyKey:'review-notification/'+id,retryable:false}});
   if(!result.sent)throw Error('Delivery unavailable');
   await sql`UPDATE review_email_queue SET finished_at=now(),result='accepted',claim=NULL WHERE id=${id} AND claim=${token}::uuid`;
   sent++;
  }catch{
   failed++;
   await sql`UPDATE review_email_queue SET claim=NULL,retry_at=now()+interval '10 minutes',result='delivery_failed',
    finished_at=CASE WHEN attempts>=6 THEN now() END WHERE id=${id} AND claim=${token}::uuid`;
  }
 }
 // Remove old delivery payloads, including cancelled subscriptions and expired attempts.
 await sql`DELETE FROM review_email_queue WHERE id IN (SELECT id FROM review_email_queue WHERE due_at<now()-interval '35 days' LIMIT 200)`;
 return {submitted:sent,failed};
}
