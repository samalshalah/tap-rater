import {withMarketingAccess} from '@/lib/customer-marketing-access';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {z} from 'zod';
import {googleCustomerIdentity,customerFlowCookie} from '@/lib/google-business/customer-connection';
import {beginGoogleConnection,googleConnectionSummary} from '@/lib/google-business/connection';
import {googleSameOrigin} from '@/lib/google-business/http';
import {bindGoogleLocation,clientFor,liveDb,LiveReviewError} from '@/lib/google-business/live-reviews';
import {GoogleBusinessError} from '@/lib/google-business/client';
import {customerLocationConnection,customerLocationFlowCookie} from '@/lib/google-business/customer-location-connection';
const resource=z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/);
const bodySchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('connect'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('disconnect'),businessId:z.string().uuid(),confirm:z.literal(true)}).strict(),
 z.object({action:z.literal('accounts'),businessId:z.string().uuid(),parent:resource.optional(),pageToken:z.string().max(4096).optional()}).strict(),
 z.object({action:z.literal('locations'),businessId:z.string().uuid(),account:resource,pageToken:z.string().max(4096).optional()}).strict(),
 z.object({action:z.literal('bind'),businessId:z.string().uuid(),account:resource,location:z.string().regex(/^locations\/[A-Za-z0-9_-]+$/),confirmAssignment:z.literal(true)}).strict()
]);
async function marketingGET(request:Request){
 const identity=await googleCustomerIdentity();
 if(!identity)return NextResponse.json({error:'Sign in to continue.'},{status:401});
 try{
 const businesses=await liveDb()`SELECT b.id,b.business_name,b.address FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE lower(c.email)=${identity.email} AND c.account_status='active' AND b.status IS DISTINCT FROM 'marketing_removed' ORDER BY b.business_name`;
 const id=new URL(request.url).searchParams.get('businessId');
 const scope=id&&z.string().uuid().safeParse(id).success?await customerLocationConnection(identity,id):null;
 return NextResponse.json({connection:scope?await googleConnectionSummary(scope.connectionOwner):null,businesses},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Google connection setup is unavailable. Please try again.'},{status:503});}
}
async function marketingPOST(request:Request){
 const identity=await googleCustomerIdentity();
 if(!identity)return NextResponse.json({error:'Sign in to continue.'},{status:401});
 try{
 if(!googleSameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:'Request too large.'},{status:413});
 const parsed=bodySchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Check your selection.'},{status:400});
 const v=parsed.data;const scope=await customerLocationConnection(identity,v.businessId);let result:unknown;
 if(v.action==='connect'){
  const authorizationUrl=await beginGoogleConnection(scope.owner,identity.session);
  const state=new URL(authorizationUrl).searchParams.get('state')!;
  (await cookies()).set(customerFlowCookie,state,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});
  (await cookies()).set(customerLocationFlowCookie,v.businessId,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});
  result={authorizationUrl};
 }else if(v.action==='disconnect'){
  await liveDb()`WITH stopped AS (UPDATE google_review_links SET enabled=false,auto_enabled=false,ai_consent=false,profile_ai_enabled=false,settings_version=settings_version+1 WHERE business_id=${v.businessId}::uuid AND (owner=${scope.owner} OR owner=${scope.connectionOwner}) RETURNING business_id), attempts AS (DELETE FROM google_business_oauth_attempts WHERE owner=${scope.owner}) DELETE FROM google_business_connections WHERE owner=${scope.owner}`;
  result={disconnected:true};
 }else if(v.action==='accounts')result=await (await clientFor(scope.connectionOwner)).listAccounts(v.pageToken,v.parent);
 else if(v.action==='locations')result=await (await clientFor(scope.connectionOwner)).listLocations(v.account,v.pageToken);
 else result=await bindGoogleLocation(scope.connectionOwner,v.businessId,v.account,v.location,liveDb(),clientFor,identity.email);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:(e as {code?:string}).code==='P0001'?'Your package has no available location slot. Contact Tap Rater to adjust access.':e instanceof LiveReviewError||e instanceof GoogleBusinessError?e.message:'Could not complete Google setup. Reconnect or try again.'},{status:e instanceof LiveReviewError?e.status:503});}
}

export const GET=(request:Request)=>withMarketingAccess(request,()=>marketingGET(request));

export const POST=(request:Request)=>withMarketingAccess(request,()=>marketingPOST(request));
