import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from './customer-auth';
import {googleAdminIdentity} from './google-business/http';
import {LiveReviewError} from './google-business/live-reviews';
import {GoogleBusinessError} from './google-business/client';
import {heatmapMutation,heatmapSnapshot,mutateHeatmap} from './heatmap-management';
import type {ReviewActor} from './review-workspaces';
export async function handleHeatmap(request:Request,kind:'admin'|'customer'){
 let actor:ReviewActor;
 if(kind==='admin'){if(!await googleAdminIdentity())return NextResponse.json({error:'Sign in to continue.'},{status:401});actor={kind:'admin'};}
 else{const auth=await requireCustomerApi();if(auth.response)return auth.response;actor={kind:'customer',email:auth.session.email};}
 try{
  let data;
  if(request.method==='GET'){
   const id=z.string().uuid().safeParse(new URL(request.url).searchParams.get('businessId'));
   if(!id.success)return NextResponse.json({error:'Choose a location.'},{status:400});
   data=await heatmapSnapshot(actor,id.data);
  }else{
   if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
   const raw=await request.text();if(raw.length>4000)return NextResponse.json({error:'Request too large.'},{status:413});
   let body;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
   const parsed=heatmapMutation.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Check the keyword and grid settings.'},{status:400});
   data=await mutateHeatmap(actor,parsed.data);
  }
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof LiveReviewError||e instanceof GoogleBusinessError?e.message:'Heat-map setup is unavailable. Please try again.'},{status:e instanceof LiveReviewError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
