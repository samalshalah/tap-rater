import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {z} from 'zod';
import {googleCustomerIdentity,customerFlowCookie} from '@/lib/google-business/customer-connection';
import {beginGoogleConnection,googleConnectionSummary} from '@/lib/google-business/connection';
import {googleSameOrigin} from '@/lib/google-business/http';
import {bindGoogleLocation,clientFor,liveDb,LiveReviewError} from '@/lib/google-business/live-reviews';
import {GoogleBusinessError} from '@/lib/google-business/client';
const resource=z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/);
const bodySchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('connect')}).strict(),
 z.object({action:z.literal('accounts'),parent:resource.optional(),pageToken:z.string().max(4096).optional()}).strict(),
 z.object({action:z.literal('locations'),account:resource,pageToken:z.string().max(4096).optional()}).strict(),
 z.object({action:z.literal('bind'),businessId:z.string().uuid(),account:resource,location:z.string().regex(/^locations\/[A-Za-z0-9_-]+$/),confirmAssignment:z.literal(true)}).strict()
]);
export async function GET(){
 const identity=await googleCustomerIdentity();
 if(!identity)return NextResponse.json({error:'Sign in to continue.'},{status:401});
 try{
 const businesses=await liveDb()`SELECT b.id,b.business_name,b.address FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE lower(c.email)=${identity.email} AND c.account_status='active' ORDER BY b.business_name`;
 return NextResponse.json({connection:await googleConnectionSummary(identity.owner),businesses},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Google connection setup is unavailable. Please try again.'},{status:503});}
}
export async function POST(request:Request){
 const identity=await googleCustomerIdentity();
 if(!identity)return NextResponse.json({error:'Sign in to continue.'},{status:401});
 try{
 if(!googleSameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:'Request too large.'},{status:413});
 const parsed=bodySchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Check your selection.'},{status:400});
 const v=parsed.data;let result:unknown;
 if(v.action==='connect'){
  const authorizationUrl=await beginGoogleConnection(identity.owner,identity.session);
  const state=new URL(authorizationUrl).searchParams.get('state')!;
  (await cookies()).set(customerFlowCookie,state,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});
  result={authorizationUrl};
 }else if(v.action==='accounts')result=await (await clientFor(identity.owner)).listAccounts(v.pageToken,v.parent);
 else if(v.action==='locations')result=await (await clientFor(identity.owner)).listLocations(v.account,v.pageToken);
 else result=await bindGoogleLocation(identity.owner,v.businessId,v.account,v.location,liveDb(),clientFor,identity.email);
 return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof LiveReviewError||e instanceof GoogleBusinessError?e.message:'Could not complete Google setup. Reconnect or try again.'},{status:e instanceof LiveReviewError?e.status:503});}
}
