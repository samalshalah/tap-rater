import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '@/lib/customer-auth';
import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {liveDb,syncLiveReviews} from '@/lib/google-business/live-reviews';
import {paidReviewPreview,resumePaidReviewPreview} from '@/lib/reviews-preview-setup';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('resumePreview')}).strict(),
 z.object({action:z.literal('chooseExisting'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('choose'),name:z.string().trim().min(1).max(200),address:z.string().max(1000),placeId:z.string().max(500).optional()}).strict(),
 z.object({action:z.literal('import')}).strict(),z.object({action:z.literal('finish')}).strict()
]);
async function handle(request:Request){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 const email=auth.session.email.toLowerCase(),sql=liveDb();
 const snapshot=async()=>{
  const [row]=await sql`SELECT EXISTS(SELECT 1 FROM reviews_draft_only_customers policy WHERE policy.customer_id=c.id) AS drafts_only,c.marketing_onboarding_completed_at AS completed,c.marketing_onboarding_business_id AS business_id,COALESCE(l.title,b.business_name) AS business_name,l.review_total,l.enabled AS connected,l.synced_at,l.next_page,l.last_error,p.synced_at AS profile_synced,(SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=b.id AND (l.sync_run IS NULL OR r.seen_run=l.sync_run)) AS review_count FROM customers c LEFT JOIN businesses b ON b.id=c.marketing_onboarding_business_id AND b.customer_id=c.id LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=c.id LEFT JOIN google_profile_drafts p ON p.business_id=b.id AND p.parent=l.parent AND p.google_subject=l.google_subject WHERE lower(c.email)=${email}`;
  if(!row?.completed&&!row?.business_id){
   const businesses=await sql`SELECT b.id,b.business_name,b.address FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE lower(c.email)=${email} AND c.account_status='active' AND b.status IS DISTINCT FROM 'marketing_removed' ORDER BY b.business_name,b.id`;
   return {...row,businesses,preview:await paidReviewPreview(email,sql)};
  }
  return row;
 };
 try{
  if(request.method==='GET')return NextResponse.json(await snapshot(),{headers:{'Cache-Control':'no-store'}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const raw=await request.text();if(raw.length>4000)throw Error('Invalid request.');const v=input.parse(JSON.parse(raw));
  if(v.action==='resumePreview'){
   await resumePaidReviewPreview(email,sql);
  }else if(v.action==='chooseExisting'){
   const selected=await sql`WITH account AS MATERIALIZED (SELECT id,marketing_onboarding_business_id FROM customers WHERE lower(email)=${email} AND account_status='active' FOR UPDATE), owned AS MATERIALIZED (SELECT b.id,b.customer_id FROM businesses b JOIN account c ON c.id=b.customer_id WHERE b.id=${v.businessId}::uuid AND b.status IS DISTINCT FROM 'marketing_removed' AND (c.marketing_onboarding_business_id IS NULL OR c.marketing_onboarding_business_id=b.id)), licensed AS MATERIALIZED (SELECT id,customer_id FROM owned WHERE claim_marketing_location(id,customer_id)) UPDATE customers c SET marketing_onboarding_business_id=l.id FROM licensed l WHERE c.id=l.customer_id RETURNING l.id`;
   if(!selected.length)throw Error('Choose an available location from your account. If all location slots are in use, manage your subscription or contact support.');
  }else if(v.action==='choose'){
   await sql`WITH account AS (SELECT id,marketing_onboarding_business_id FROM customers WHERE lower(email)=${email} AND account_status='active' FOR UPDATE), created AS (SELECT create_marketing_business(id,${v.name},${v.address}) AS id,id AS customer_id FROM account WHERE marketing_onboarding_business_id IS NULL) UPDATE customers c SET marketing_onboarding_business_id=n.id FROM created n WHERE c.id=n.customer_id`;
  }else{
   const row=await snapshot();if(!row?.business_id||!row.connected)throw Error('Connect the selected Google business first.');
   if(v.action==='import'){
    const actor={kind:'customer' as const,email};
    if(!row.synced_at||row.next_page||row.last_error)await syncLiveReviews(actor,String(row.business_id));
   }else{
    if(!row.synced_at||row.next_page||row.last_error)throw Error('Wait for all review pages to finish importing.');
    await sql`UPDATE customers SET marketing_onboarding_completed_at=now() WHERE lower(email)=${email}`;
   }
  }
  return NextResponse.json(await snapshot(),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?'Check your business selection.':e instanceof Error?e.message:'Setup could not finish.'},{status:400});}
}
export const GET=(request:Request)=>withMarketingAccess(request,()=>handle(request));
export const POST=GET;
