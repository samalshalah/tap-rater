import {NextResponse} from 'next/server';
import {requireCustomerApi} from '@/lib/customer-auth';
import {getCustomerOrderById,guardedOrderUpdate} from '@/lib/orders';
import {getSupabaseAdmin} from '@/lib/db';
import {loadCustomerStandProof,assertProofOrder,StandProofError} from '@/lib/customer-stand-proof';
import {buildProofApprovalSnapshot} from '@/lib/direct-production';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
type Context={params:Promise<{id:string;lineItemIndex:string}>};
async function handle(request:Request,context:Context,approve:boolean){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(approve&&request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 const {id,lineItemIndex}=await context.params;const index=Number(lineItemIndex);
 if(!/^[0-9a-f-]{36}$/i.test(id)||! /^(0|[1-9][0-9]*)$/.test(lineItemIndex)||!Number.isSafeInteger(index))return NextResponse.json({error:'Invalid stand.'},{status:400,headers});
 try{
  const {order}=await getCustomerOrderById(id,auth.session.email);
  if(!order||order.email?.trim().toLowerCase()!==auth.session.email.trim().toLowerCase())return NextResponse.json({error:'Order not found.'},{status:404,headers});
  if(approve)assertProofOrder(order,index);
  const proof=await loadCustomerStandProof(order,index);
  if(!approve)return NextResponse.json({image:proof.image,version:proof.version,quantity:proof.quantity},{headers});
  const input=await request.json().catch(()=>null);
  if(input?.confirmed!==true||input?.version!==proof.version)return NextResponse.json({error:'The design changed. Reopen the proof before approving.'},{status:409,headers});
  const now=new Date().toISOString();const items=order.line_items_json.map((item,i)=>i!==index?item:{...item,proofApproved:true,setup:{...item.setup,baseTemplateContentHash:proof.snapshot.baseTemplateContentHash,logoContentHash:proof.snapshot.logoContentHash,proofApprovalSnapshot:buildProofApprovalSnapshot(proof.snapshot),proofApprovedAt:now,customerProofApproval:{version:proof.version,approvedAt:now,approvedBy:auth.session.email}}});
  const {data,error}=await guardedOrderUpdate(getSupabaseAdmin(),order,{line_items_json:items}).eq('email',order.email).select('id').maybeSingle();
  if(error)throw Error();if(!data)return NextResponse.json({error:'Order changed. Reload the proof.'},{status:409,headers});
  return NextResponse.json({approved:true},{headers});
 }catch(error){return NextResponse.json({error:error instanceof StandProofError?error.message:'Could not load or save this proof.'},{status:error instanceof StandProofError?error.status:503,headers});}
}
export const GET=(request:Request,context:Context)=>handle(request,context,false);
export const POST=(request:Request,context:Context)=>handle(request,context,true);
