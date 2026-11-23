import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';

type CancelRouteContext={params:Promise<{id:string}>};
const headers={'Cache-Control':'private, no-store'};

export async function POST(request:Request,context:CancelRouteContext){
  const denied=await requireAdminApi();if(denied)return denied;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  const {id}=await context.params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:'Order identifier is invalid.'},{status:400,headers});
  const body=await request.json().catch(()=>null);
  if(body?.confirmation!=='CANCEL')return NextResponse.json({error:'Confirm the cancellation before continuing.'},{status:400,headers});
  try{
    // Guards match orderCancelBlock, plus: no Multi-Link licence may still point at this order.
    const rows=await liveDb()`UPDATE orders o SET status='canceled',payment_status='canceled',updated_at=now(),
        internal_notes=concat_ws(E'\n',NULLIF(o.internal_notes,''),'Cancelled by admin on '||to_char(now(),'YYYY-MM-DD')||' (was '||o.status||' / '||coalesce(o.payment_status,'none')||').')
      WHERE o.id=${id}::uuid AND o.status<>'canceled'
        AND coalesce(o.shipping_status,'') NOT IN ('shipped','delivered')
        AND (o.stripe_checkout_session_id LIKE 'cs_test_%' OR coalesce(o.payment_status,'') IN ('manual_unpaid','complimentary','unpaid'))
        AND NOT EXISTS(SELECT 1 FROM hosted_subscriptions s WHERE s.order_id=o.id)
        AND NOT EXISTS(SELECT 1 FROM hosted_page_codes c WHERE c.retired_at IS NULL AND c.physical_product_ref LIKE '%:order:'||o.id::text||':%')
      RETURNING o.id`;
    if(!(rows as unknown[]).length)return NextResponse.json({error:'This order can’t be cancelled here. It may be charged, shipped, already cancelled or still have a Multi-Link licence.'},{status:409,headers});
    return NextResponse.json({ok:true},{headers});
  }catch{return NextResponse.json({error:'Could not cancel the order. Try again.'},{status:503,headers});}
}
