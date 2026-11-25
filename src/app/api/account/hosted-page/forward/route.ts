import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {requireCustomerApi} from '@/lib/customer-auth';
import {getHostedPageEditorContext} from '@/lib/hosted-page-editor';
import {getHostedPageStorage} from '@/lib/hosted-pages/app-storage';
import {publishHostedPageSnapshot,readCurrentHostedPageSnapshot} from '@/lib/hosted-pages/repository';
import {isValidHostedPageCode} from '@/lib/hosted-pages/codes';
import {normalizeHostedPageForwardUrl,validateHostedPageSnapshot} from '@/lib/hosted-pages/snapshots';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

/** Only the owner of the page can read or change where it forwards once it ends. */
async function ownedPage(email:string,code:unknown){
  if(typeof code!=='string'||!isValidHostedPageCode(code))return null;
  const context=await getHostedPageEditorContext(email,code);
  return context.configured&&context.page?.code===code?context.page:null;
}

export async function GET(request:Request){
  const auth=await requireCustomerApi();
  if(auth.response)return auth.response;
  const page=await ownedPage(auth.session.email,new URL(request.url).searchParams.get('code'));
  if(!page)return NextResponse.json({error:'That Multi-Link page was not found on your account.'},{status:404,headers});
  const storage=await getHostedPageStorage();
  const current=storage?await readCurrentHostedPageSnapshot(storage,page.code).catch(()=>null):null;
  return NextResponse.json({forwardUrl:current?.forwardUrl??null},{headers});
}

/** Set or clear the forwarding link. It only takes effect once the subscription has ended. */
export async function POST(request:Request){
  const auth=await requireCustomerApi();
  if(auth.response)return auth.response;
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request.'},{status:403,headers});
  const body=await request.json().catch(()=>null);
  const page=await ownedPage(auth.session.email,body?.code);
  if(!page)return NextResponse.json({error:'That Multi-Link page was not found on your account.'},{status:404,headers});
  const raw=typeof body?.url==='string'?body.url.trim():'';
  const forwardUrl=raw?normalizeHostedPageForwardUrl(raw):null;
  if(raw&&!forwardUrl)return NextResponse.json({error:'Enter a full web address, like https://yourbusiness.com.'},{status:400,headers});
  const storage=await getHostedPageStorage();
  if(!storage)return NextResponse.json({error:'Saving is unavailable right now. Try again later.'},{status:503,headers});
  try{
    const current=await readCurrentHostedPageSnapshot(storage,page.code);
    if(!current)return NextResponse.json({error:'Publish your page first, then add a forwarding link.'},{status:409,headers});
    // Same page, same status: only the forwarding link changes.
    await publishHostedPageSnapshot(storage,validateHostedPageSnapshot({...current,forwardUrl:forwardUrl??undefined,version:`forward-${Date.now()}-${randomUUID().slice(0,8)}`,publishedAt:new Date().toISOString()}));
    return NextResponse.json({ok:true,forwardUrl},{headers});
  }catch(error){
    console.error('Multi-Link forwarding link save failed',page.code,error);
    return NextResponse.json({error:'The forwarding link couldn’t be saved. Try again.'},{status:500,headers});
  }
}
