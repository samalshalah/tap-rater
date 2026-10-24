import {NextResponse} from 'next/server';
import {requireCustomerApi} from '@/lib/customer-auth';
import {getCustomerOrderById,guardedOrderUpdate} from '@/lib/orders';
import {getSupabaseAdmin} from '@/lib/db';
import {loadCustomerStandProof,assertProofOrder,StandProofError} from '@/lib/customer-stand-proof';
import {buildProofApprovalSnapshot} from '@/lib/direct-production';
import {proofHistory,publicProofHistory,proofAwaitingRevision,type ProofEvent} from '@/lib/stand-proof-history';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
type Context={params:Promise<{id:string;lineItemIndex:string}>};
async function handle(request:Request,context:Context,write:boolean){
 const auth=await requireCustomerApi();if(auth.response)return auth.response;
 if(write&&request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
 const {id,lineItemIndex}=await context.params;const index=Number(lineItemIndex);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^(0|[1-9][0-9]*)$/.test(lineItemIndex)||!Number.isSafeInteger(index))return NextResponse.json({error:'Invalid stand.'},{status:400,headers});
 try{
  const {order}=await getCustomerOrderById(id,auth.session.email);
  if(!order||order.email?.trim().toLowerCase()!==auth.session.email.trim().toLowerCase())return NextResponse.json({error:'Order not found.'},{status:404,headers});
  const item=assertProofOrder(order,index,write);
  const revision=new URL(request.url).searchParams.get('revision');
  if(revision&&!write){
   const selected=proofHistory(item).find(e=>e.id===revision&&e.action==='uploaded');
   if(!selected?.attachment)throw new StandProofError('Revision not found.',404);
   const historic={...order,line_items_json:order.line_items_json.map((line,i)=>i===index?{...line,setup:{...line.setup,customerProof:selected.attachment}}:line)};
   const preview=await loadCustomerStandProof(historic,index);return NextResponse.json({image:preview.image},{headers});
  }
  const proof=await loadCustomerStandProof(order,index);
  const pending=proofAwaitingRevision(item,proof.version);
  if(!write){let editable=true;try{assertProofOrder(order,index);}catch{editable=false;}return NextResponse.json({image:proof.image,version:proof.version,quantity:proof.quantity,history:publicProofHistory(item),awaitingRevision:pending,canRespond:editable&&!pending&&!item.proofApproved},{headers});}
  const input=await request.json().catch(()=>null),action=input?.action??'approve';
  if(!['approve','corrections'].includes(action))throw new StandProofError('Choose an action.',400);
  if(input?.version!==proof.version||pending||item.proofApproved)throw new StandProofError('The proof changed or already has a response. Reopen it to see the latest version.');
  if(action==='approve'&&input?.confirmed!==true)throw new StandProofError('Confirm the design before approving.');
  const notes=typeof input?.notes==='string'?input.notes.trim():'';
  if(action==='corrections'&&(!notes||notes.length>2000))throw new StandProofError('Describe the corrections in 1–2,000 characters.',400);
  const now=new Date().toISOString();
  const event:ProofEvent={id:crypto.randomUUID(),action:action==='approve'?'approved':'corrections',at:now,version:proof.version,...(action==='corrections'?{notes}:{})};
  const setup={...item.setup,customerProofHistory:[...proofHistory(item),event],...(action==='approve'?{baseTemplateContentHash:proof.snapshot.baseTemplateContentHash,logoContentHash:proof.snapshot.logoContentHash,proofApprovalSnapshot:buildProofApprovalSnapshot(proof.snapshot),proofApprovedAt:now,customerProofApproval:{version:proof.version,approvedAt:now,approvedBy:auth.session.email},customerProofCorrection:undefined}:{proofApprovalSnapshot:undefined,proofApprovedAt:undefined,customerProofApproval:undefined,customerProofCorrection:{version:proof.version,notes,requestedAt:now}})};
  const items=order.line_items_json.map((line,i)=>i!==index?line:{...line,proofApproved:action==='approve',setup});
  const patch=action==='approve'?{line_items_json:items}:{line_items_json:items,production_status:'blocked' as const};
  const {data,error}=await guardedOrderUpdate(getSupabaseAdmin(),order,patch).eq('email',order.email).select('id').maybeSingle();
  if(error)throw Error();if(!data)throw new StandProofError('Order changed. Reload the proof.');
  return NextResponse.json({approved:action==='approve',correctionsRequested:action==='corrections'},{headers});
 }catch(error){return NextResponse.json({error:error instanceof StandProofError?error.message:'Could not load or save this proof.'},{status:error instanceof StandProofError?error.status:503,headers});}
}
export const GET=(request:Request,context:Context)=>handle(request,context,false);
export const POST=(request:Request,context:Context)=>handle(request,context,true);
