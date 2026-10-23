import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {liveDb,syncLiveReviews} from '@/lib/google-business/live-reviews';
import {mutateProfile} from '@/lib/google-business/profile-management';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('choose'),name:z.string().trim().min(1).max(200),address:z.string().max(1000),placeId:z.string().max(500).optional()}).strict(),
 z.object({action:z.literal('import')}).strict(),z.object({action:z.literal('finish')}).strict()
]);
async function handle(request:Request){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 const email=auth.session.email.toLowerCase(),sql=liveDb();
 const snapshot=async()=>{
  const [row]=await sql`SELECT c.marketing_onboarding_completed_at AS completed,c.marketing_onboarding_business_id AS business_id,COALESCE(l.title,b.business_name) AS business_name,l.review_total,l.enabled AS connected,l.synced_at,l.next_page,l.last_error,p.synced_at AS profile_synced,(SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=b.id AND (l.sync_run IS NULL OR r.seen_run=l.sync_run)) AS review_count FROM customers c LEFT JOIN businesses b ON b.id=c.marketing_onboarding_business_id AND b.customer_id=c.id LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=c.id LEFT JOIN google_profile_drafts p ON p.business_id=b.id AND p.parent=l.parent AND p.google_subject=l.google_subject WHERE lower(c.email)=${email}`;
  return row;
 };
 try{
  if(request.method==='GET')return NextResponse.json(await snapshot(),{headers:{'Cache-Control':'no-store'}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const raw=await request.text();if(raw.length>4000)throw Error('Invalid request.');const v=input.parse(JSON.parse(raw));
  if(v.action==='choose'){
   await sql`WITH account AS (SELECT id,marketing_onboarding_business_id FROM customers WHERE lower(email)=${email} AND account_status='active' FOR UPDATE), created AS (INSERT INTO businesses(customer_id,business_name,address,status,google_place_id) SELECT id,${v.name},${v.address},'active',${v.placeId||null} FROM account WHERE marketing_onboarding_business_id IS NULL RETURNING id,customer_id) UPDATE customers c SET marketing_onboarding_business_id=n.id FROM created n WHERE c.id=n.customer_id`;
  }else{
   const row=await snapshot();if(!row?.business_id||!row.connected)throw Error('Connect the selected Google business first.');
   if(v.action==='import'){
    const actor={kind:'customer' as const,email};
    if(!row.profile_synced)await mutateProfile(actor,{action:'refresh',businessId:String(row.business_id)});
    if(!row.synced_at||row.next_page||row.last_error)await syncLiveReviews(actor,String(row.business_id));
   }else{
    if(!row.synced_at||row.next_page||row.last_error||!row.profile_synced)throw Error('Wait for the business information and all review pages to finish importing.');
    await sql`UPDATE customers SET marketing_onboarding_completed_at=now() WHERE lower(email)=${email}`;
   }
  }
  return NextResponse.json(await snapshot(),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?'Check your business selection.':e instanceof Error?e.message:'Setup could not finish.'},{status:400});}
}
export const GET=(request:Request)=>withMarketingAccess(request,()=>handle(request));
export const POST=GET;
