import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {createHostedPageCode} from '@/lib/hosted-pages/codes';
import {validateHostedPageEditorDraft} from '@/lib/hosted-page-editor';
const inputSchema=z.object({customerId:z.string().uuid(),requestId:z.string().uuid(),businessName:z.string().trim().min(2).max(120),expiresAt:z.string().datetime().nullable()});
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 const parsed=inputSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success||(parsed.data.expiresAt&&Date.parse(parsed.data.expiresAt)<=Date.now()))return NextResponse.json({error:'Choose an account, business name and future expiry.'},{status:400,headers});
 const input=parsed.data,reference=`admin:${input.requestId}`,code=createHostedPageCode();
 const draft=validateHostedPageEditorDraft({businessName:input.businessName,buttons:[],appearance:{theme:'light',accentColor:'#0f766e'}});
 try{
  const sql=liveDb();
  const rows=await sql`WITH target AS (
   SELECT id FROM customers WHERE id=${input.customerId}::uuid AND account_status='active'
  ), existing AS (
   SELECT id,customer_id FROM hosted_subscriptions WHERE stripe_checkout_session_id=${reference}
  ), business AS (
   INSERT INTO businesses(customer_id,business_name,status)
   SELECT id,${input.businessName},'active' FROM target WHERE NOT EXISTS(SELECT 1 FROM existing) RETURNING id,customer_id
  ), page AS (
   INSERT INTO hosted_page_editor_pages(customer_id,business_id,code,lifecycle_status,draft_json)
   SELECT customer_id,id,${code},'ACTIVE',${JSON.stringify(draft)}::jsonb FROM business RETURNING id,business_id,customer_id
  ), granted AS (
   INSERT INTO hosted_subscriptions(customer_id,business_id,hosted_page_id,stripe_checkout_session_id,stripe_subscription_id,permanent_code,hosted_page_url,status,lifecycle_status,current_period_end,cancel_at_period_end,provisioning_status)
   SELECT customer_id,business_id,id,${reference},${reference},${code},${`https://taprater.com/p/${code}`},'active','ACTIVE',${input.expiresAt}::timestamptz,${Boolean(input.expiresAt)},'ready_for_customer_setup' FROM page RETURNING id,customer_id
  ) SELECT id FROM granted UNION ALL SELECT id FROM existing WHERE customer_id=${input.customerId}::uuid`;
  if(!rows.length)return NextResponse.json({error:'Account is unavailable or request belongs to another account.'},{status:409,headers});
  return NextResponse.json({granted:true},{headers});
 }catch{return NextResponse.json({error:'Could not grant the licence. Retry with the same request.'},{status:503,headers});}
}
