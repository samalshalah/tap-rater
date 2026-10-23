import {denyAdminClientContent} from '@/lib/admin-client-privacy';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireCustomerApi} from '../customer-auth';
import {googleAdminIdentity} from './http';
import {GoogleBusinessError} from './client';
import {GoogleTokenExchangeError} from './connection';
import {approveLiveDraft,liveReviewPage,flagLiveReview} from './live-reviews';
import type {ReviewActor} from '../review-workspaces';
import {authorizedLink,bindGoogleLocation,clientFor,liveDb,livePublishingEnabled,LiveReviewError,listLiveWorkspaces,liveSettingsSchema,saveLiveSettings,stopLiveReviews,syncLiveReviews,saveLiveDraft,suggestLiveReply,publishLiveReply,reconcileLiveReply} from './live-reviews';
const uuid=z.string().uuid(),token=z.string().max(4096).optional(),account=z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('accounts'),parent:account.optional(),pageToken:token}).strict(),
 z.object({action:z.literal('locations'),account,pageToken:token}).strict(),
 z.object({action:z.literal('bind'),businessId:uuid,account,location:z.string().regex(/^locations\/[A-Za-z0-9_-]+$/),confirmAssignment:z.literal(true)}).strict(),
 z.object({action:z.literal('sync'),businessId:uuid}).strict(),
 z.object({action:z.literal('stop'),businessId:uuid}).strict(),
 z.object({action:z.literal('remove'),businessId:uuid}).strict(),
 z.object({action:z.literal('save'),id:uuid,draft:z.string().trim().max(4000),version:z.number().int().positive()}).strict(),
 z.object({action:z.literal('approve'),id:uuid,version:z.number().int().positive()}).strict(),
 z.object({action:z.literal('spam'),id:uuid,spam:z.boolean(),version:z.number().int().positive()}).strict(),
 z.object({action:z.literal('suggest'),id:uuid}).strict(),
 z.object({action:z.literal('publish'),id:uuid,version:z.number().int().positive(),confirmPublicReply:z.literal(true)}).strict(),
 z.object({action:z.literal('reconcile'),id:uuid}).strict(),
 z.object({action:z.literal('settings'),settings:liveSettingsSchema}).strict()
]);
export async function handleLiveReviews(request:Request,kind:'admin'|'customer'){
 if(isStaffContentRequest(kind))return denyAdminClientContent();
 let actor:ReviewActor;let owner='';
 if(kind==='admin'){const identity=await googleAdminIdentity();if(!identity)return NextResponse.json({error:'Sign in to continue.'},{status:401});actor={kind:'admin'};owner=identity.owner;}
 else{const auth=await requireCustomerApi();if(auth.response)return auth.response;actor={kind:'customer',email:auth.session.email};}
 try{
  if(request.method==='GET'){
   const params=new URL(request.url).searchParams;
   if(params.has('businessId')){
    const page=z.object({businessId:uuid,offset:z.coerce.number().int().min(0).max(100000)}).safeParse({businessId:params.get('businessId'),offset:params.get('offset') || 0});
    if(!page.success)return NextResponse.json({error:'Invalid review page.'},{status:400});
    return NextResponse.json(await liveReviewPage(actor,page.data.businessId,page.data.offset),{headers:{'Cache-Control':'no-store'}});
   }
   const businesses=kind==='admin'?await liveDb()`SELECT b.id,b.business_name,c.email FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE c.account_status='active' ORDER BY b.business_name`:undefined;
   return NextResponse.json({workspaces:await listLiveWorkspaces(actor),publishingEnabled:livePublishingEnabled(),businesses},{headers:{'Cache-Control':'no-store'}});
  }
  if(request.headers.get('origin')!==new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://taprater.com').origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:'Request too large.'},{status:413});
  let value:unknown;try{value=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  const parsed=schema.safeParse(value);if(!parsed.success)return NextResponse.json({error:'Check the request and try again.'},{status:400});const v=parsed.data;
  if(['accounts','locations','bind','remove'].includes(v.action)&&kind!=='admin')return NextResponse.json({error:'Administrator access required.'},{status:403});
  if(kind==='customer'&&(v.action==='publish'||(v.action==='settings'&&v.settings.autoEnabled)))return NextResponse.json({error:'Client workspaces are draft-only. Approval does not publish.'},{status:403});
  let result:unknown;
  switch(v.action){
   case 'accounts':result=await (await clientFor(owner)).listAccounts(v.pageToken,v.parent);break;
   case 'locations':result=await (await clientFor(owner)).listLocations(v.account,v.pageToken);break;
   case 'bind':result=await bindGoogleLocation(owner,v.businessId,v.account,v.location);break;
   case 'sync':result=await syncLiveReviews(actor,v.businessId);break;
   case 'stop':result=await stopLiveReviews(actor,v.businessId);break;
   case 'remove':{const rows=await liveDb()`DELETE FROM google_review_links WHERE business_id=${v.businessId} AND NOT enabled RETURNING business_id`;if(!rows.length)throw new LiveReviewError('Stop the connection before removing its assignment.');result={removed:true};break;}
   case 'save':result=await saveLiveDraft(actor,v.id,v.draft,v.version);break;
   case 'spam':result=await flagLiveReview(actor,v.id,v.spam,v.version);break;
   case 'approve':result=await approveLiveDraft(actor,v.id,v.version);break;
   case 'suggest':result={suggestions:await suggestLiveReply(actor,v.id)};break;
   case 'publish':result=await publishLiveReply(actor,v.id,v.version);break;
   case 'reconcile':result=await reconcileLiveReply(actor,v.id);break;
   case 'settings':result=await saveLiveSettings(actor,v.settings);break;
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const message=(e as {code?:string}).code==='P0001'?'This account has no available marketing location slot. Contact Tap Rater to adjust access.':e instanceof LiveReviewError||e instanceof GoogleBusinessError?e.message:e instanceof GoogleTokenExchangeError?'Reconnect the managing Google account.':'Google reviews could not complete this request. Check the connection and try again.';
  return NextResponse.json({error:message},{status:e instanceof LiveReviewError?e.status:503});
 }
}

function isStaffContentRequest(kind:string):boolean{return kind==='admin';}
