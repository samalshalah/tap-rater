import {businessOptimizationEnabled,optimizationPausedMessage} from '@/lib/business-optimization-feature';
import {denyAdminClientContent} from '@/lib/admin-client-privacy';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '../customer-auth';
import {googleAdminIdentity} from './http';
import {LiveReviewError} from './live-reviews';
import {GoogleBusinessError} from './client';
import {profileMutation,profileSnapshot,mutateProfile,locationPerformance,searchCategories} from './profile-management';
import type {ReviewActor} from '../review-workspaces';
export async function handleProfile(request:Request,kind:'admin'|'customer'){
 if(isStaffContentRequest(kind))return denyAdminClientContent();
 if(!businessOptimizationEnabled)return NextResponse.json({error:optimizationPausedMessage,code:'OPTIMIZATION_PAUSED'},{status:410,headers:{'Cache-Control':'no-store'}});
 let actor:ReviewActor;
 if(kind==='admin'){if(!await googleAdminIdentity())return NextResponse.json({error:'Sign in to continue.'},{status:401});actor={kind:'admin'};}
 else{const auth=await requireCustomerApi();if(auth.response)return auth.response;actor={kind:'customer',email:auth.session.email};}
 try{
  let result;
  if(request.method==='GET'){
   const p=new URL(request.url).searchParams,id=z.string().uuid().safeParse(p.get('businessId'));
   if(!id.success)return NextResponse.json({error:'Choose a location.'},{status:400});
   result=p.get('view')==='categories'?await searchCategories(actor,id.data,p.get('query')||'',p.get('pageToken')||''):p.get('view')==='performance'?await locationPerformance(actor,id.data,Number(p.get('days')||28)):await profileSnapshot(actor,id.data);
  }else{
   if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
   const raw=await request.text();if(raw.length>2000000)return NextResponse.json({error:'Request too large.'},{status:413});
   let body;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
   const input=profileMutation.safeParse(body);if(!input.success)return NextResponse.json({error:'Check the draft fields.'},{status:400});
   result=await mutateProfile(actor,input.data);
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof LiveReviewError||e instanceof GoogleBusinessError?e.message:'Google profile data is unavailable. Please try again.'},{status:e instanceof LiveReviewError?e.status:503,headers:{'Cache-Control':'no-store'}});}
}

function isStaffContentRequest(kind:string):boolean{return kind==='admin';}
