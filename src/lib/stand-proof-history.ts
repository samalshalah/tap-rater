import {createHash} from 'node:crypto';
import type {OrderLineItem} from './orders';
export type ProofAttachment={storageKey:string;contentType:string;uploadedAt:string};
export type ProofEvent={id:string;action:'uploaded'|'approved'|'corrections';at:string;version?:string;notes?:string;attachment?:ProofAttachment};
export function proofHistory(item:OrderLineItem):ProofEvent[]{
 const entries=Array.isArray(item.setup?.customerProofHistory)?[...item.setup.customerProofHistory as ProofEvent[]]:[];
 const attachment=item.setup?.customerProof as ProofAttachment|undefined;
 if(attachment?.storageKey&&!entries.some(e=>e.attachment?.storageKey===attachment.storageKey))entries.push({id:createHash('sha256').update(attachment.storageKey).digest('hex'),action:'uploaded',at:attachment.uploadedAt||'',attachment});
 const approval=item.setup?.customerProofApproval as {version?:string;approvedAt?:string}|undefined;
 if(approval?.version&&approval.approvedAt&&!entries.some(e=>e.action==='approved'&&e.version===approval.version))entries.push({id:`approved-${approval.version}`,action:'approved',at:approval.approvedAt,version:approval.version});
 return entries.sort((a,b)=>a.at.localeCompare(b.at));
}
export function publicProofHistory(item:OrderLineItem){return proofHistory(item).map(({id,action,at,notes,attachment})=>({id,action,at,notes,hasPreview:Boolean(attachment)}));}
export function proofAwaitingRevision(item:OrderLineItem,version:string){return (item.setup?.customerProofCorrection as {version?:string}|undefined)?.version===version;}
