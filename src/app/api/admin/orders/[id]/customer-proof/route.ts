import {NextResponse} from 'next/server';
import {requireAdminApi} from '@/lib/admin-auth';
import {getAdminOrderById,guardedOrderUpdate,getOrderLineItemProductionSummary} from '@/lib/orders';
import {getSupabaseAdmin} from '@/lib/db';
import {getProductMediaBucket,readImageDimensions} from '@/lib/admin-media-storage';
import {assertProofOrder,StandProofError} from '@/lib/customer-stand-proof';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await requireAdminApi();if(denied)return denied;
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid order.'},{status:400});
 try{
  if(Number(request.headers.get('content-length'))>9000000)throw new StandProofError('Use an image smaller than 8 MB.',400);
  const form=await request.formData(),indexText=String(form.get('lineItemIndex')),index=Number(indexText),file=form.get('file');
  if(!/^(0|[1-9][0-9]*)$/.test(indexText)||!(file instanceof File)||!file.size||file.size>8000000||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new StandProofError('Choose a stand and a PNG, JPEG or WebP proof under 8 MB.',400);
  const {order}=await getAdminOrderById(id);if(!order)throw new StandProofError('Order not found.',404);
  const item=assertProofOrder(order,index);if(getOrderLineItemProductionSummary(item).fulfillmentKind!=='custom')throw new StandProofError('Branded proofs use the configured design. Upload finished proofs only for custom stands.');const bytes=await file.arrayBuffer();const dimensions=readImageDimensions(bytes,file.type);if(!dimensions?.width||!dimensions.height)throw new StandProofError('Invalid proof image.',400);
  const bucket=await getProductMediaBucket();if(!bucket)throw Error();
  const key=`products/customer-proofs/production_artwork/${id}/${index}/${crypto.randomUUID()}`;
  await bucket.put(key,bytes,{httpMetadata:{contentType:file.type,cacheControl:'private, no-store'}});
  const items=order.line_items_json.map((line,i)=>i!==index?line:{...item,proofApproved:false,setup:{...item.setup,customerProof:{storageKey:key,contentType:file.type,uploadedAt:new Date().toISOString()},proofApprovalSnapshot:undefined,customerProofApproval:undefined,proofApprovedAt:undefined}});
  const {data,error}=await guardedOrderUpdate(getSupabaseAdmin(),order,{line_items_json:items,production_status:'blocked'}).select('id').maybeSingle();
  if(error)throw Error();if(!data)throw new StandProofError('Order changed. Reload and upload again.');
  return NextResponse.json({saved:true});
 }catch(error){return NextResponse.json({error:error instanceof StandProofError?error.message:'Could not save the proof.'},{status:error instanceof StandProofError?error.status:503});}
}
