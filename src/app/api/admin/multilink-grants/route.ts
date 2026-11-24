import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {createHostedPageCode} from '@/lib/hosted-pages/codes';
import {validateHostedPageEditorDraft} from '@/lib/hosted-page-editor';
import {grantedStandReference,multiLinkGrantStands} from '@/lib/multilink-granted-stand';
import {getHostedPageStorage} from '@/lib/hosted-pages/app-storage';
import {ensureHostedPagePlaceholder} from '@/lib/hosted-pages/placeholder';
const inputSchema=z.object({customerId:z.string().uuid(),requestId:z.string().uuid(),businessName:z.string().trim().min(2).max(120),expiresAt:z.string().datetime().nullable(),standSlug:z.string().trim().max(120).nullable().optional()});
const headers={'Cache-Control':'private, no-store'};
// Multi-Link stands an admin can grant a licence for.
export async function GET(){
 const denied=await requireAdminApi();if(denied)return denied;
 return NextResponse.json({stands:multiLinkGrantStands().map(({slug,title,headline})=>({slug,title,headline}))},{headers});
}
export async function POST(request:Request){
 const denied=await requireAdminApi();if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 const parsed=inputSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success||(parsed.data.expiresAt&&Date.parse(parsed.data.expiresAt)<=Date.now()))return NextResponse.json({error:'Choose an account, business name and future expiry.'},{status:400,headers});
 const input=parsed.data,reference=`admin:${input.requestId}`,code=createHostedPageCode();
 const stand=input.standSlug?multiLinkGrantStands().find(item=>item.slug===input.standSlug):undefined;
 if(input.standSlug&&!stand)return NextResponse.json({error:'Choose a Multi-Link stand.'},{status:400,headers});
 // The chosen stand sets the page heading and shows on the client's licence card.
 const productRef=stand?grantedStandReference(stand.slug,input.requestId):reference;
 const draft=validateHostedPageEditorDraft({businessName:input.businessName,headline:stand?.headline,buttons:[],appearance:{theme:'light',accentColor:'#6b7280'}});
 try{
  const sql=liveDb();
  const rows=await sql`WITH target AS (
   SELECT id FROM customers WHERE id=${input.customerId}::uuid AND account_status='active'
  ), existing AS (
   SELECT id,customer_id,hosted_page_id,permanent_code FROM hosted_subscriptions WHERE stripe_checkout_session_id=${reference}
  ), page_code AS (
   -- Every page code must be registered before a page or subscription can use it.
   INSERT INTO hosted_page_codes(code,physical_product_ref,assigned_by)
   SELECT ${code},${productRef},'admin-multilink-grant' FROM target WHERE NOT EXISTS(SELECT 1 FROM existing) RETURNING code
  ), business AS (
   INSERT INTO businesses(customer_id,business_name,status)
   SELECT id,${input.businessName},'active' FROM target WHERE NOT EXISTS(SELECT 1 FROM existing) RETURNING id,customer_id
  ), page AS (
   INSERT INTO hosted_page_editor_pages(customer_id,business_id,code,lifecycle_status,draft_json)
   SELECT business.customer_id,business.id,page_code.code,'ACTIVE',${JSON.stringify(draft)}::jsonb FROM business CROSS JOIN page_code RETURNING id,business_id,customer_id
  ), granted AS (
   INSERT INTO hosted_subscriptions(customer_id,business_id,hosted_page_id,stripe_checkout_session_id,stripe_subscription_id,permanent_code,hosted_page_url,status,lifecycle_status,current_period_end,cancel_at_period_end,provisioning_status)
   SELECT customer_id,business_id,id,${reference},${reference},${code},${`https://taprater.com/p/${code}`},'active','ACTIVE',${input.expiresAt}::timestamptz,${Boolean(input.expiresAt)},'ready_for_customer_setup' FROM page RETURNING id,customer_id,hosted_page_id,permanent_code
  ) SELECT id,hosted_page_id,permanent_code FROM granted UNION ALL SELECT id,hosted_page_id,permanent_code FROM existing WHERE customer_id=${input.customerId}::uuid`;
  if(!rows.length)return NextResponse.json({error:'Account is unavailable or request belongs to another account.'},{status:409,headers});
  // Make the permanent link live now (a 'being set up' page) so its QR code works before publishing.
  const granted=(rows as {hosted_page_id?:string;permanent_code?:string}[])[0];
  let linkLive=false;
  try{
   const storage=await getHostedPageStorage();
   if(storage&&granted?.hosted_page_id&&granted.permanent_code){await ensureHostedPagePlaceholder(storage,{code:granted.permanent_code,physicalProductRef:granted.hosted_page_id,assignedBy:'admin-multilink-grant',businessName:input.businessName,headline:stand?.headline});linkLive=true;}
  }catch(error){console.error('Multi-Link grant placeholder failed',error);}
  return NextResponse.json({granted:true,linkLive,url:granted?.permanent_code?`https://taprater.com/p/${granted.permanent_code}`:undefined},{headers});
 }catch{return NextResponse.json({error:'Could not grant the licence. Retry with the same request.'},{status:503,headers});}
}
