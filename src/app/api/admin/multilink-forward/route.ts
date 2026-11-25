import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-reviews';
import {getHostedPageStorage} from '@/lib/hosted-pages/app-storage';
import {isValidHostedPageCode} from '@/lib/hosted-pages/codes';
import {readHostedPageForwardUrl,saveHostedPageForwardUrl} from '@/lib/hosted-pages/forward-link';

const headers={'Cache-Control':'private, no-store'};

async function knownCode(code:unknown){
  if(typeof code!=='string'||!isValidHostedPageCode(code))return null;
  const rows=await liveDb()`SELECT 1 FROM hosted_subscriptions WHERE permanent_code=${code} LIMIT 1`;
  return (rows as unknown[]).length?code:null;
}

export async function GET(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  try{
    const code=await knownCode(new URL(request.url).searchParams.get('code'));
    if(!code)return NextResponse.json({error:'That Multi-Link page was not found.'},{status:404,headers});
    const storage=await getHostedPageStorage();
    return NextResponse.json({forwardUrl:storage?await readHostedPageForwardUrl(storage,code):null},{headers});
  }catch{return NextResponse.json({error:'Could not load the forwarding link.'},{status:503,headers});}
}

/** Admin: set or clear where an ended Multi-Link page sends visitors. */
export async function POST(request:Request){
  const denied=await requireAdminApi();if(denied)return denied;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  const body=await request.json().catch(()=>null);
  try{
    const code=await knownCode(body?.code);
    if(!code)return NextResponse.json({error:'That Multi-Link page was not found.'},{status:404,headers});
    const storage=await getHostedPageStorage();
    if(!storage)return NextResponse.json({error:'Page storage is unavailable. Try again later.'},{status:503,headers});
    const result=await saveHostedPageForwardUrl(storage,code,body?.url);
    if(!result.ok)return NextResponse.json({error:result.error},{status:result.status,headers});
    return NextResponse.json({ok:true,forwardUrl:result.forwardUrl},{headers});
  }catch(error){
    console.error('Admin forwarding link save failed',error);
    return NextResponse.json({error:'The forwarding link couldn’t be saved. Try again.'},{status:500,headers});
  }
}
