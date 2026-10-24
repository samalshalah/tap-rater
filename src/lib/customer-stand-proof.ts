import {createHash} from 'node:crypto';
import {buildCurrentApprovalSnapshot,composeProductionArtworkDocument,getProductionArtworkTemplate} from './production-artwork';
import {getProductMediaObject} from './admin-media-storage';
import {getOrderLineItemProductionSummary,type OrderRecord} from './orders';
export class StandProofError extends Error {constructor(message:string,public status=409){super(message);}}
export function assertProofOrder(order:OrderRecord,index:number,approving=true){
 if(order.status!=='paid'||!['paid','complimentary'].includes(order.payment_status||'')||order.stripe_refund_id||order.refund_status)throw new StandProofError('Proof approval requires a confirmed order.');
 if(approving&&(order.shipped_at||['shipped','delivered'].includes(order.shipping_status)||['in_production','completed'].includes(order.production_status)))throw new StandProofError('This order is already in production or shipped.');
 const item=order.line_items_json[index];if(!item)throw new StandProofError('Proof not found.',404);
 if(!getOrderLineItemProductionSummary(item).proofRequired)throw new StandProofError('This stand does not need proof approval.');
 return item;
}
export async function loadCustomerStandProof(order:OrderRecord,index:number){
 const item=assertProofOrder(order,index,false);let bytes:Buffer,contentType:string;
 const snapshot=buildCurrentApprovalSnapshot(item),attachment=item.setup?.customerProof as {storageKey?:string;contentType?:string}|undefined;
 if(attachment?.storageKey){
  if(!attachment.storageKey.startsWith(`products/customer-proofs/production_artwork/${order.id}/${index}/`))throw new StandProofError('Proof unavailable.');
  const object=await getProductMediaObject(attachment.storageKey);if(!object)throw new StandProofError('Proof unavailable.',404);
  bytes=Buffer.from(await (object.arrayBuffer?object.arrayBuffer():new Response(object.body).arrayBuffer()));
  contentType=attachment.contentType||'';if(!['image/png','image/jpeg','image/webp'].includes(contentType))throw new StandProofError('Proof format unavailable.');
 }else{
  const template=getProductionArtworkTemplate(item);
  if(!template||item.setup?.designAssistanceRequested===true)throw new StandProofError('Your design is being prepared.');
  const composed=await composeProductionArtworkDocument(item,template,'customer-preview',order.updated_at||order.created_at||'');
  Object.assign(snapshot,composed.assetHashes);bytes=Buffer.from(composed.svg);contentType='image/svg+xml';
 }
 const version=createHash('sha256').update(JSON.stringify({snapshot,updatedAt:order.updated_at,index,quantity:item.quantity})).update(bytes).digest('hex');
 return {version,image:`data:${contentType};base64,${bytes.toString('base64')}`,snapshot,quantity:item.quantity};
}
