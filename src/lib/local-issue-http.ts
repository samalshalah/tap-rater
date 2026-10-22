import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from './customer-auth';
import {googleAdminIdentity} from './google-business/http';
import {LiveReviewError} from './google-business/live-reviews';
import {localIssueSnapshot,mutateIssue,issueMutation} from './local-issues';
import type {ReviewActor} from './review-workspaces';
export async function handleLocalIssues(request:Request,kind:'admin'|'customer'){
 let actor:ReviewActor;
 if(kind==='admin'){if(!await googleAdminIdentity())return NextResponse.json({error:'Sign in to continue.'},{status:401});actor={kind:'admin'};}
 else{const auth=await requireCustomerApi();if(auth.response)return auth.response;actor={kind:'customer',email:auth.session.email};}
 try{
  let data;
  if(request.method==='GET'){const id=new URL(request.url).searchParams.get('businessId');if(id&&!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Choose a location.'},{status:400});data=await localIssueSnapshot(actor,id||undefined);}
  else{if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});const text=await request.text();if(text.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});let parsed;try{parsed=issueMutation.safeParse(JSON.parse(text));}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}if(!parsed.success)return NextResponse.json({error:'Invalid request.'},{status:400});data=await mutateIssue(actor,parsed.data);}
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof LiveReviewError?e.message:'Notifications are unavailable. Please try again.'},{status:e instanceof LiveReviewError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
