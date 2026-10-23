import {denyAdminClientContent} from '@/lib/admin-client-privacy';
import { NextResponse } from 'next/server';
import { requireCustomerApi } from './customer-auth';
import { googleAdminIdentity } from './google-business/http';
import { LiveReviewError } from './google-business/live-reviews';
import { localMutation,localSnapshot,mutateLocal } from './local-management';
import type { ReviewActor } from './review-workspaces';
export async function handleLocal(request:Request,kind:'admin'|'customer') {
 if(isStaffContentRequest(kind))return denyAdminClientContent();
 let actor:ReviewActor;
 if(kind==='admin') { if(!await googleAdminIdentity())return NextResponse.json({error:'Sign in to continue.'},{status:401}); actor={kind:'admin'}; }
 else { const auth=await requireCustomerApi();if(auth.response)return auth.response;actor={kind:'customer',email:auth.session.email}; }
 try {
  if(request.method==='GET')return NextResponse.json(await localSnapshot(actor),{headers:{'Cache-Control':'no-store'}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const raw=await request.text();if(raw.length>16000)return NextResponse.json({error:'Request too large.'},{status:413});
  let data;try{data=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  const parsed=localMutation.safeParse(data);if(!parsed.success)return NextResponse.json({error:'Check the fields and listing URL.'},{status:400});
  return NextResponse.json(await mutateLocal(actor,parsed.data),{headers:{'Cache-Control':'no-store'}});
 } catch(e) { return NextResponse.json({error:(e as {code?:string}).code==='P0001'?'Purchase an additional location license before adding another business.':e instanceof LiveReviewError?e.message:'Local management is unavailable. Please try again.'},{status:(e as {code?:string}).code==='P0001'?403:e instanceof LiveReviewError?e.status:503}); }
}

function isStaffContentRequest(kind:string):boolean{return kind==='admin';}
