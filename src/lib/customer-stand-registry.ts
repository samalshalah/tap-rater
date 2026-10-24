import {neon} from '@neondatabase/serverless';
import type {CustomerPortalStand,CustomerPortalDevice} from './customer-portal';
const database=()=>neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
export async function customerStandRegistry(email:string,sql=database()){
 return sql`SELECT s.id,s.public_id,s.order_id,s.line_id,s.unit_number,s.device_id,
 CASE WHEN s.assignment_customer_id=c.id THEN s.draft_label ELSE '' END AS draft_label,
 CASE WHEN s.assignment_customer_id=c.id THEN s.draft_business_id ELSE null END AS draft_business_id,
 b.business_name AS assigned_business_name,s.assignment_version
 FROM customer_stand_registry s LEFT JOIN orders o ON o.id=s.order_id LEFT JOIN devices d ON d.id=s.device_id
 JOIN customers c ON ((s.order_id IS NOT NULL AND lower(o.email)=lower(c.email)) OR (s.device_id IS NOT NULL AND d.customer_id=c.id))
 LEFT JOIN businesses b ON b.id=s.draft_business_id AND b.customer_id=c.id AND s.assignment_customer_id=c.id
 WHERE lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active'`;
}
export function attachStandRegistry(stands:CustomerPortalStand[],devices:CustomerPortalDevice[],rows:Record<string,any>[]):CustomerPortalStand[]{
 const result=stands.map(stand=>{const row=rows.find(r=>r.order_id===stand.orderId&&r.line_id===stand.standLineId&&Number(r.unit_number)===stand.unitNumber);return row?{...stand,standId:row.public_id,registryId:row.id,assignedBusinessId:row.draft_business_id||undefined,assignedBusinessName:row.assigned_business_name||undefined,standLabel:row.draft_label||undefined,assignmentVersion:Number(row.assignment_version)}:{...stand,standId:undefined};});
 for(const device of devices){const row=rows.find(r=>r.device_id===device.id);if(!row)continue;result.push({id:`device-${device.id}`,orderId:'',lineItemIndex:0,orderReference:'',title:device.label||'Registered stand',quantity:1,kind:'standard',deviceCode:device.deviceCode,standId:row.public_id,registryId:row.id,assignedBusinessId:row.draft_business_id||undefined,assignedBusinessName:row.assigned_business_name||undefined,standLabel:row.draft_label||undefined,assignmentVersion:Number(row.assignment_version),destinationUrl:device.destinationUrl,proofStatus:'not_needed',productionStatus:device.status,shippingStatus:'',multiLinkSetupPending:false,primaryActionLabel:'View stand',primaryActionHref:'/account/stands'});}
 return result;
}
export async function saveStandAssignment(email:string,id:string,businessId:string|null,label:string,version:number,sql=database()){
 const rows=await sql`UPDATE customer_stand_registry s SET assignment_customer_id=c.id,draft_business_id=${businessId}::uuid,draft_label=${label},assignment_version=s.assignment_version+1
 FROM customers c WHERE s.id=${id}::uuid AND lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active' AND s.assignment_version=${version}
 AND ((s.order_id IS NOT NULL AND EXISTS(SELECT 1 FROM orders o WHERE o.id=s.order_id AND lower(o.email)=lower(c.email))) OR (s.device_id IS NOT NULL AND EXISTS(SELECT 1 FROM devices d WHERE d.id=s.device_id AND d.customer_id=c.id)))
 AND (${businessId}::uuid IS NULL OR EXISTS(SELECT 1 FROM businesses b WHERE b.id=${businessId}::uuid AND b.customer_id=c.id)) RETURNING s.id,s.assignment_version`;
 return rows[0]||null;
}

export async function orderStandRegistry(orderId:string,sql=database()){
 return sql`SELECT public_id,line_id,unit_number FROM customer_stand_registry WHERE order_id=${orderId}::uuid ORDER BY line_id,unit_number`;
}
