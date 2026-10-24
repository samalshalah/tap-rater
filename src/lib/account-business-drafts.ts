import {neon} from '@neondatabase/serverless';
import {z} from 'zod';
const database=()=>neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
export const businessDraftFields=z.object({
 name:z.string().trim().min(1).max(200),address:z.string().trim().max(1000),phone:z.string().trim().max(80),
 website:z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'Use a full http or https website address.')
}).strict();
export const businessDraftInput=z.object({version:z.number().int().nonnegative().max(2147483646),draft:businessDraftFields}).strict();
export type BusinessDraftFields=z.infer<typeof businessDraftFields>;
export type AccountBusiness={id:string;current:BusinessDraftFields;draft:BusinessDraftFields|null;version:number};
export async function accountBusinesses(email:string,businessId:string|null=null,sql=database()):Promise<AccountBusiness[]>{
 const rows=await sql`SELECT b.id,b.business_name,b.address,b.phone,b.website_url,d.draft,d.version
 FROM businesses b JOIN customers c ON c.id=b.customer_id
 LEFT JOIN account_business_drafts d ON d.business_id=b.id AND d.customer_id=b.customer_id
 WHERE lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active' AND (${businessId}::uuid IS NULL OR b.id=${businessId}::uuid)
 ORDER BY b.business_name,b.id`;
 return rows.map(row=>({id:String(row.id),current:{name:String(row.business_name||''),address:String(row.address||''),phone:String(row.phone||''),website:String(row.website_url||'')},draft:row.draft?businessDraftFields.parse(row.draft):null,version:Number(row.version||0)}));
}
export async function saveAccountBusinessDraft(email:string,businessId:string,input:z.infer<typeof businessDraftInput>,sql=database()){
 const rows=await sql`INSERT INTO account_business_drafts (business_id,customer_id,draft)
 SELECT b.id,b.customer_id,${JSON.stringify(input.draft)}::jsonb FROM businesses b JOIN customers c ON c.id=b.customer_id
 WHERE b.id=${businessId}::uuid AND lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active'
 AND (${input.version}=0 OR EXISTS(SELECT 1 FROM account_business_drafts d WHERE d.business_id=b.id AND d.customer_id=b.customer_id AND d.version=${input.version}))
 ON CONFLICT (business_id,customer_id) DO UPDATE SET draft=EXCLUDED.draft,version=account_business_drafts.version+1,updated_at=now()
 WHERE account_business_drafts.version=${input.version}
 RETURNING version`;
 return rows[0]?{draft:input.draft,version:Number(rows[0].version)}:null;
}
