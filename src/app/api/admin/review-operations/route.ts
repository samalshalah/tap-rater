import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb, liveSettingsSchema, reconcileLiveReply, saveLiveSettings, syncLiveReviews, updateReviewReplyDelay} from '@/lib/google-business/live-reviews';

const delay=z.union([z.literal(5),z.literal(20),z.literal(60),z.literal(120),z.literal(360),z.literal(1440)]);
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('delay'),businessId:z.string().uuid(),delayMinutes:delay}).strict(),
 z.object({action:z.literal('settings'),settings:liveSettingsSchema}).strict(),
 z.object({action:z.literal('sync'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('resumeDrafts'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('retryFailedPublishes'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('reconcilePublishes'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('pauseAutomation'),businessId:z.string().uuid()}).strict(),
]);

export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 const origin=request.headers.get('origin');
 const expected=process.env.NODE_ENV==='development'?new URL(request.url).origin:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://taprater.com').origin;
 if(origin!==expected)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{
  const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});
  const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Choose a valid reply delay.'},{status:400});
  const actor={kind:'admin'} as const;
  const result=parsed.data.action==='delay'
   ? await updateReviewReplyDelay(actor,parsed.data.businessId,parsed.data.delayMinutes)
   : parsed.data.action==='settings'
    ? await saveLiveSettings(actor,parsed.data.settings)
     : parsed.data.action==='sync'
     ? await syncLiveReviews(actor,parsed.data.businessId,undefined,undefined,true)
     : parsed.data.action==='resumeDrafts'
      ? await resumeDrafts(parsed.data.businessId)
      : parsed.data.action==='retryFailedPublishes'
       ? await retryFailedPublishes(parsed.data.businessId)
       : parsed.data.action==='reconcilePublishes'
        ? await reconcilePublishes(parsed.data.businessId)
        : await pauseAutomation(parsed.data.businessId);
  if(parsed.data.action==='settings'||parsed.data.action==='delay'||parsed.data.action==='pauseAutomation'){
   const sql=liveDb();
   const id=parsed.data.action==='settings'?parsed.data.settings.businessId:parsed.data.businessId;
   const details=parsed.data.action==='pauseAutomation'?{operation:'pauseAutomation'}:parsed.data;
   try{await sql`INSERT INTO admin_review_setting_audit(business_id,admin_email,action,details) VALUES(${id},${process.env.ADMIN_EMAIL||'admin'},${parsed.data.action==='delay'?'delay':'settings'},${JSON.stringify(details)}::jsonb)`;}catch(error){console.warn('review_settings_audit_unavailable',error);}
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const message=error instanceof SyntaxError?'Invalid request.':error instanceof Error?error.message:'Reply timing could not be updated.';
  return NextResponse.json({error:message},{status:400});
 }
}

async function resumeDrafts(businessId:string){
 const sql=liveDb();
 const rows=await sql`UPDATE google_review_links SET draft_due_at=now(),draft_error=NULL WHERE business_id=${businessId} AND enabled AND ai_consent RETURNING business_id`;
 if(!rows.length)throw new Error('Draft processing can only be resumed for an active location with AI replies enabled.');
 await sql`UPDATE review_worker_alerts SET resolved_at=now(),failures=0,updated_at=now() WHERE business_id=${businessId} AND stage='draft' AND resolved_at IS NULL`;
 return {resumed:true};
}

async function retryFailedPublishes(businessId:string){
 const sql=liveDb();
 const rows=await sql`UPDATE google_live_reviews r SET scheduled_at=now(),scheduled_version=r.version,schedule_consent_at=l.consent_at,schedule_failures=0
 FROM google_review_links l WHERE r.business_id=${businessId} AND l.business_id=r.business_id AND l.enabled AND l.ai_consent AND l.auto_enabled
 AND r.publish_state='idle' AND r.schedule_failures>0 AND r.scheduled_at IS NULL AND r.draft<>'' AND NOT r.auto_schedule_cancelled AND NOT r.suspected_spam
 AND r.approved_version IS NULL AND r.data->>'starRating' IN ('FOUR','FIVE') AND coalesce(r.data->'reviewReply'->>'comment','')=''
 AND (r.old_reply_requested_at IS NOT NULL OR NULLIF(r.data->>'createTime','')::timestamptz>l.consent_at)
 AND ((r.data->>'starRating'='FOUR' AND l.auto_four) OR (r.data->>'starRating'='FIVE' AND l.auto_five)) RETURNING r.id`;
 return {retried:rows.length};
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
