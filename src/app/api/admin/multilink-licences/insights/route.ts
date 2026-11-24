import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {getHostedPageInsights,readInsightRange} from '@/lib/hosted-page-insights';

const headers={'Cache-Control':'private, no-store'};
const schema=z.object({customerId:z.string().uuid(),code:z.string().regex(/^[A-HJKMNPQRSTVWXYZ2-9]{12}$/)});

// Admin view of a client's Multi-Link page activity.
export async function GET(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  const url=new URL(request.url);
  const parsed=schema.safeParse({customerId:url.searchParams.get('customerId'),code:url.searchParams.get('code')});
  if(!parsed.success)return NextResponse.json({error:'Choose a licence.'},{status:400,headers});
  try{
    const sql=liveDb();
    const pages=await sql`SELECT p.draft_json FROM hosted_page_editor_pages p JOIN hosted_subscriptions s ON s.hosted_page_id=p.id WHERE p.code=${parsed.data.code} AND s.customer_id=${parsed.data.customerId}::uuid LIMIT 1`;
    const page=(pages as {draft_json?:{buttons?:{id:string;label:string}[]}}[])[0];
    if(!page)return NextResponse.json({error:'Licence was not found for this client.'},{status:404,headers});
    const insights=await getHostedPageInsights(parsed.data.code,readInsightRange(url.searchParams.get('days')),sql);
    const labels=Object.fromEntries((page.draft_json?.buttons??[]).map(button=>[button.id,button.label]));
    return NextResponse.json({insights,labels},{headers});
  }catch(error){console.error('Admin Multi-Link insights failed',error);return NextResponse.json({error:'Insights are unavailable right now.'},{status:503,headers});}
}
