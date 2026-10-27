import type {CustomerPortalStand} from '@/lib/customer-portal';
import {formatOrderReference} from '@/lib/order-reference';
export type StandSearchEntry={stand:CustomerPortalStand;text:string};
/** Rebuild only when stand data changes; preserve the original spacing and searchable fields. */
export function indexStandSearch(stands:CustomerPortalStand[]):StandSearchEntry[]{
 return stands.map(stand=>({stand,text:`${stand.standLabel??""} ${stand.assignedBusinessName??""} ${stand.standId??""} ${stand.title} ${stand.businessName ?? ""} ${formatOrderReference(stand.orderReference)}`.toLowerCase()}));
}
export function filterStandSearch(entries:StandSearchEntry[],kind:string,search:string):CustomerPortalStand[]{
 const query=search.toLowerCase();
 return entries.filter(({stand,text})=>(kind==='all'||stand.kind===kind)&&text.includes(query)).map(entry=>entry.stand);
}
