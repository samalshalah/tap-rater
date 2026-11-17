import {NextResponse} from 'next/server';
import {z} from 'zod';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {checkLoginRateLimit,recordLoginAttempt} from '@/lib/auth-rate-limit';
import {clientFor,liveDb} from '@/lib/google-business/live-reviews';
import {GoogleBusinessError} from '@/lib/google-business/client';
import {matchReviewPreview,currentReviewPreview,previewOwner,previewSelectionSchema,reviewPreviewSnapshot,startReviewPreview,connectReviewPreview,selectReviewPreview,continueReviewPreview} from '@/lib/reviews-purchase-preview';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
const account=z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/),pageToken=z.string().max(2048).optional();
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('start'),selection:previewSelectionSchema}).strict(),
 z.object({action:z.literal('connect')}).strict(),
 z.object({action:z.literal('accounts'),pageToken,parentAccount:account.optional()}).strict(),
 z.object({action:z.literal('locations'),account,pageToken}).strict(),
 z.object({action:z.literal('select'),account,location:z.string().regex(/^locations\/[A-Za-z0-9_-]+$/)}).strict(),
 z.object({action:z.literal('match')}).strict(),
 z.object({action:z.literal('analyse')}).strict()
]);
export async function GET(){
 if(!marketingCheckoutEnabled())return NextResponse.json({error:'Reviews subscriptions are unavailable.'},{status:503,headers});
 try{return NextResponse.json(await reviewPreviewSnapshot(),{headers});}catch{return NextResponse.json({error:'Preview unavailable. Please try again.'},{status:503,headers});}
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 if(!marketingCheckoutEnabled())return NextResponse.json({error:'Reviews subscriptions are unavailable.'},{status:503,headers});
 try{
  const raw=await request.text();if(raw.length>6000)throw Error('Invalid request.');const v=input.parse(JSON.parse(raw));
  if(v.action==='start'||v.action==='connect'){
   const limit=await checkLoginRateLimit({headers:request.headers,identifier:`reviews-preview:${request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||'anonymous'}`,scope:'customer_recovery'});
   if(!limit.context.configured||limit.limited)return NextResponse.json({error:'Please wait before starting another preview.'},{status:429,headers});
   await recordLoginAttempt(limit.context,false);
  }
  let result;
  if(!['start','connect'].includes(v.action)){
   const row=await currentReviewPreview();if(!row)throw Error('Your preview expired. Start again.');
   const allowed=await liveDb()`UPDATE reviews_purchase_previews SET api_after=now()+interval '800 milliseconds',api_calls=api_calls+1 WHERE id=${row.id} AND api_after<=now() AND api_calls<2000 RETURNING id`;
   if(!allowed.length)return NextResponse.json({error:'Please wait a moment before continuing the preview.'},{status:429,headers});
  }
  if(v.action==='start')result=await startReviewPreview(v.selection);
  else if(v.action==='connect')result=await connectReviewPreview();
  else if(v.action==='match')result=await matchReviewPreview();
  else if(v.action==='select')result=await selectReviewPreview(v.account,v.location);
  else if(v.action==='analyse')result=await continueReviewPreview();
  else{
   const row=await currentReviewPreview();if(!row||row.purchase_attempt)throw Error('Start a new preview to choose a business.');
   const client=await clientFor(previewOwner(row.id));
   result=v.action==='accounts'?await client.listAccounts(v.pageToken,v.parentAccount):await client.listLocations(v.account,v.pageToken);
  }
  return NextResponse.json(result,{headers});
 }catch(e){return NextResponse.json({error:e instanceof GoogleBusinessError?e.message:e instanceof z.ZodError?'Check your business selection.':e instanceof Error&&!/sql|constraint|relation|database|cipher|token/i.test(e.message)?e.message:'Preview unavailable. Please reconnect Google or try again.'},{status:400,headers});}
}
