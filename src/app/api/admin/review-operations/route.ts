import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb, liveSettingsSchema, reconcileLiveReply, saveLiveSettings, syncLiveReviews, updateReviewReplyDelay, verifyAndRecoverLiveReply} from '@/lib/google-business/live-reviews';

const delay=z.union([z.literal(5),z.literal(20),z.literal(60),z.literal(120),z.literal(360),z.literal(1440)]);
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('delay'),businessId:z.string().uuid(),delayMinutes:delay}).strict(),
 z.object({action:z.literal('allowance'),businessId:z.string().uuid(),monthlyAiLimit:z.number().int().min(1).max(100000),currentMonthlyAiLimit:z.number().int().min(0).max(100000)}).strict(),
 z.object({action:z.literal('settings'),settings:liveSettingsSchema}).strict(),
 z.object({action:z.literal('sync'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('resumeDrafts'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('reconcilePublishes'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('repairReview'),businessId:z.string().uuid(),reviewId:z.string().uuid()}).strict(),
 z.object({action:z.literal('pauseAutomation'),businessId:z.string().uuid()}).strict(),
]);

export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 const origin=request.headers.get('origin');
 const expected=process.env.NODE_ENV==='development'?new URL(request.url).origin:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').origin;
 if(origin!==expected)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{
  const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});
  const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Choose a valid setting. The monthly allowance must be higher than its current value.'},{status:400});
  if(parsed.data.action==='allowance'&&parsed.data.monthlyAiLimit<=parsed.data.currentMonthlyAiLimit)return NextResponse.json({error:'Enter an allowance higher than the current monthly cap.'},{status:400});
  const actor={kind:'admin'} as const;
  const result=parsed.data.action==='allowance'
   ? await updateMonthlyAiAllowance(parsed.data.businessId,parsed.data.monthlyAiLimit,parsed.data.currentMonthlyAiLimit)
   : parsed.data.action==='delay'
   ? await updateReviewReplyDelay(actor,parsed.data.businessId,parsed.data.delayMinutes)
   : parsed.data.action==='settings'
    ? await saveLiveSettings(actor,parsed.data.settings)
     : parsed.data.action==='sync'
     ? await syncLiveReviews(actor,parsed.data.businessId,undefined,undefined,true)
     : parsed.data.action==='resumeDrafts'
      ? await resumeDrafts(parsed.data.businessId)
      : parsed.data.action==='reconcilePublishes'
        ? await reconcilePublishes(parsed.data.businessId)
        : parsed.data.action==='repairReview'
         ? await verifyAndRecoverLiveReply(actor,parsed.data.reviewId,parsed.data.businessId)
        : await pauseAutomation(parsed.data.businessId);
  if(parsed.data.action==='settings'||parsed.data.action==='delay'||parsed.data.action==='pauseAutomation'||parsed.data.action==='allowance'){
   const sql=liveDb();
   const id=parsed.data.action==='settings'?parsed.data.settings.businessId:parsed.data.businessId;
   const details=parsed.data.action==='pauseAutomation'?{operation:'pauseAutomation'}:parsed.data.action==='allowance'?{operation:'monthlyAiAllowance',monthlyAiLimit:parsed.data.monthlyAiLimit,scope:'this location only'}:parsed.data;
   try{await sql`INSERT INTO admin_review_setting_audit(business_id,admin_email,action,details) VALUES(${id},${process.env.ADMIN_EMAIL||'admin'},${parsed.data.action==='delay'?'delay':'settings'},${JSON.stringify(details)}::jsonb)`;}catch(error){console.warn('review_settings_audit_unavailable',error);}
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const message=error instanceof SyntaxError?'Invalid request.':error instanceof Error?error.message:'Reply timing could not be updated.';
  return NextResponse.json({error:message},{status:400});
 }
}

async function updateMonthlyAiAllowance(businessId:string,monthlyAiLimit:number,currentLimit:number){
 const sql=liveDb();
 const rows=await sql`WITH target AS (
  SELECT b.customer_id,coalesce(m.ai_monthly_limit_override,a.ai_monthly_limit) AS current_limit
  FROM businesses b JOIN customer_marketing_access a ON a.customer_id=b.customer_id
  JOIN marketing_location_access m ON m.business_id=b.id AND m.customer_id=b.customer_id
  WHERE b.id=${businessId} FOR UPDATE OF a,m
 ), saved AS (
  UPDATE marketing_location_access m SET ai_monthly_limit_override=${monthlyAiLimit}
  FROM target t WHERE m.business_id=${businessId} AND m.customer_id=t.customer_id AND t.current_limit=${currentLimit}
  RETURNING m.business_id,m.customer_id
 ), usage AS (
  SELECT coalesce(sum(u.units),0)::int AS used FROM marketing_usage_reservations u
  WHERE u.business_id=${businessId} AND u.service='ai' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date
 ), woken AS (
  UPDATE google_review_links l SET draft_due_at=now(),draft_error=NULL
  FROM saved s,usage u WHERE l.business_id=s.business_id AND l.customer_id=s.customer_id AND l.enabled AND l.ai_consent AND u.used<${monthlyAiLimit}
  AND l.draft_error LIKE 'Monthly AI allowance exhausted.%' RETURNING l.business_id
 ) SELECT s.customer_id,u.used,(SELECT count(*) FROM woken)::int AS woken FROM saved s CROSS JOIN usage u`;
 if(!rows.length){
  const [state]=await sql`SELECT coalesce(m.ai_monthly_limit_override,a.ai_monthly_limit) AS current_limit,coalesce((SELECT sum(u.units) FROM marketing_usage_reservations u WHERE u.business_id=${businessId} AND u.service='ai' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date),0)::int AS used FROM businesses b JOIN customer_marketing_access a ON a.customer_id=b.customer_id JOIN marketing_location_access m ON m.business_id=b.id AND m.customer_id=b.customer_id WHERE b.id=${businessId}`;
  if(!state)throw new Error('The client allowance could not be found.');
  if(Number(state.current_limit)!==currentLimit)throw new Error('The allowance changed in another session. Refresh and try again.');
  throw new Error('No monthly AI allowance change was saved.');
 }
 return {saved:true,monthlyAiLimit,used:Number(rows[0].used),woken:Number(rows[0].woken),scope:'location'};
}

async function resumeDrafts(businessId:string){
 const sql=liveDb();
 const rows=await sql`UPDATE google_review_links SET draft_due_at=now(),draft_error=NULL WHERE business_id=${businessId} AND enabled AND ai_consent RETURNING business_id`;
 if(!rows.length)throw new Error('Draft processing can only be resumed for an active location with AI replies enabled.');
 await sql`UPDATE review_worker_alerts SET resolved_at=now(),failures=0,updated_at=now() WHERE business_id=${businessId} AND stage='draft' AND resolved_at IS NULL`;
 return {resumed:true};
}

async function reconcilePublishes(businessId:string){
 const sql=liveDb();
 const rows=await sql`SELECT id FROM google_live_reviews WHERE business_id=${businessId} AND publish_state IN ('publishing','uncertain') AND attempted_at<now()-interval '1 minute' ORDER BY attempted_at LIMIT 25`;
 let checked=0,published=0,errors=0;
 for(const row of rows){try{const result=await reconcileLiveReply({kind:'admin'},String(row.id),sql);checked++;if(result.published)published++;}catch{errors++;}}
 return {checked,published,errors};
}

async function pauseAutomation(businessId:string){
 const sql=liveDb();
 const rows=await sql`UPDATE google_review_links l SET ai_consent=false,auto_enabled=false,consent_at=NULL,settings_version=settings_version+1
 FROM businesses b WHERE l.business_id=${businessId} AND b.id=l.business_id AND b.customer_id=l.customer_id RETURNING l.business_id`;
 if(!rows.length)throw new Error('This Google Reviews location could not be found.');
 const cancelled=await sql`UPDATE google_live_reviews SET scheduled_at=NULL,old_reply_requested_at=NULL WHERE business_id=${businessId} AND publish_state='idle' AND scheduled_at IS NOT NULL AND approved_version IS NULL RETURNING id`;
 return {paused:true,cancelled:cancelled.length};
}
