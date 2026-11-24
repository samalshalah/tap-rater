import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {licenceSource,removalBlock,type AdminMultiLinkLicence} from '@/lib/admin-multilink-licences';
import {getHostedPageStorage} from '@/lib/hosted-pages/app-storage';
import {retireHostedPage} from '@/lib/hosted-pages/placeholder';

const headers={'Cache-Control':'private, no-store'};
const customerId=z.string().uuid();
const removeSchema=z.object({customerId,code:z.string().regex(/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/)});

export async function GET(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  const id=customerId.safeParse(new URL(request.url).searchParams.get('customerId'));
  if(!id.success)return NextResponse.json({error:'Choose an account.'},{status:400,headers});
  try{
    const rows=await liveDb()`SELECT s.permanent_code AS code,
      COALESCE(NULLIF(p.draft_json->>'businessName',''),b.business_name,'Multi-Link page') AS business_name,
      s.stripe_subscription_id AS reference,
      (p.published_at IS NOT NULL OR EXISTS(SELECT 1 FROM hosted_page_snapshots x WHERE x.code=s.permanent_code)) AS published,
      COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p.draft_json->'buttons')='array' THEN p.draft_json->'buttons' END),0)::int AS links,
      (SELECT count(*) FROM billing_invoices i WHERE i.hosted_subscription_id=s.id)::int AS invoices,
      s.created_at
     FROM hosted_subscriptions s LEFT JOIN hosted_page_editor_pages p ON p.id=s.hosted_page_id LEFT JOIN businesses b ON b.id=s.business_id
     WHERE s.customer_id=${id.data}::uuid ORDER BY s.created_at`;
    const licences:AdminMultiLinkLicence[]=(rows as Record<string,unknown>[]).map(row=>{
      const base={source:licenceSource(String(row.reference??'')),published:Boolean(row.published),invoices:Number(row.invoices??0)};
      const blockedReason=removalBlock(base);
      return {...base,code:String(row.code),businessName:String(row.business_name),links:Number(row.links??0),createdAt:String(row.created_at??''),removable:!blockedReason,blockedReason};
    });
    return NextResponse.json({licences},{headers});
  }catch{return NextResponse.json({error:'Could not load Multi-Link licences.'},{status:503,headers});}
}

export async function DELETE(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  const parsed=removeSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a licence to remove.'},{status:400,headers});
  const {customerId:owner,code}=parsed.data;
  try{
    const sql=liveDb();
    // One statement: the guards and every delete succeed together or not at all.
    const rows=await sql`WITH target AS (
      SELECT s.id,s.hosted_page_id,s.business_id FROM hosted_subscriptions s LEFT JOIN hosted_page_editor_pages p ON p.id=s.hosted_page_id
      WHERE s.customer_id=${owner}::uuid AND s.permanent_code=${code}
        AND (s.stripe_subscription_id LIKE 'admin:%' OR s.stripe_subscription_id LIKE 'manual:%')
        AND p.published_at IS NULL
        AND NOT EXISTS(SELECT 1 FROM hosted_page_snapshots x WHERE x.code=s.permanent_code)
        AND NOT EXISTS(SELECT 1 FROM billing_invoices i WHERE i.hosted_subscription_id=s.id)
        AND NOT EXISTS(SELECT 1 FROM billing_invoice_items i WHERE i.hosted_subscription_id=s.id)
    ), removed AS (
      DELETE FROM hosted_subscriptions s USING target WHERE s.id=target.id RETURNING target.hosted_page_id
    ), page AS (
      DELETE FROM hosted_page_editor_pages p USING removed WHERE p.id=removed.hosted_page_id RETURNING p.id
    ), retired AS (
      -- Keep the code row so it is never handed out again; mark it retired.
      UPDATE hosted_page_codes SET retired_at=now() WHERE code=${code} AND EXISTS(SELECT 1 FROM page) RETURNING code
    ) SELECT retired.code FROM retired`;
    // The business record stays: other data (locations, reviews) may hang off it.
    if(!(rows as unknown[]).length)return NextResponse.json({error:'This licence can’t be removed. It may be paid, published, invoiced or already gone.'},{status:409,headers});
    // Take the public page offline too, so the link shows "not active" instead of the old page.
    let pageRetired=false;
    try{const storage=await getHostedPageStorage();if(storage){await retireHostedPage(storage,code);pageRetired=true;}}
    catch(error){console.error('Multi-Link page retire failed',code,error);}
    return NextResponse.json({removed:code,pageRetired},{headers});
  }catch{return NextResponse.json({error:'Could not remove the licence. Try again.'},{status:503,headers});}
}
