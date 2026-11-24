import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {getHostedPageStorage} from '@/lib/hosted-pages/app-storage';
import {ensureHostedPagePlaceholder} from '@/lib/hosted-pages/placeholder';
import type {HostedPageLifecycleStatus} from '@/lib/hosted-pages/snapshots';
import {createQrSvg} from '@/lib/qr-code';

const headers={'Cache-Control':'private, no-store'};
const schema=z.object({customerId:z.string().uuid(),code:z.string().regex(/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/)});

// Admin copy of a client's page QR code. Makes sure the permanent link is live first.
export async function POST(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a licence.'},{status:400,headers});
  const {customerId,code}=parsed.data;
  try{
    const rows=await liveDb()`SELECT p.id,p.lifecycle_status,COALESCE(NULLIF(p.draft_json->>'businessName',''),b.business_name) AS business_name,p.draft_json->>'headline' AS headline,p.draft_json->>'logoUrl' AS logo_url
      FROM hosted_page_editor_pages p JOIN hosted_subscriptions s ON s.hosted_page_id=p.id LEFT JOIN businesses b ON b.id=p.business_id
      WHERE p.code=${code} AND s.customer_id=${customerId}::uuid LIMIT 1`;
    const page=(rows as Record<string,string|null>[])[0];
    if(!page?.id)return NextResponse.json({error:'Licence was not found for this client.'},{status:404,headers});
    const storage=await getHostedPageStorage();
    if(!storage)return NextResponse.json({error:'Page storage is not available. Try again shortly.'},{status:503,headers});
    await ensureHostedPagePlaceholder(storage,{
      code,physicalProductRef:page.id,assignedBy:'admin-qr',
      businessName:page.business_name||'Multi-Link page',headline:page.headline||undefined,
      logoUrl:/^https?:\/\//.test(page.logo_url??'')?page.logo_url!:undefined,
      lifecycleStatus:(page.lifecycle_status||'ACTIVE') as HostedPageLifecycleStatus
    });
    const url=`https://taprater.com/p/${code}`;
    return NextResponse.json({url,svg:await createQrSvg(url)},{headers});
  }catch(error){console.error('Admin Multi-Link QR failed',error);return NextResponse.json({error:'The QR code couldn’t be created. Try again.'},{status:500,headers});}
}
