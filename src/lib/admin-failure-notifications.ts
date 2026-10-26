import {neon} from '@neondatabase/serverless';
export function failureTitle(code:string){return ({review_ai_allowance:'Review drafts: monthly AI allowance exhausted',review_access_unavailable:'Review drafts: service access unavailable'} as Record<string,string>)[code]||code.replace(/[_-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());}
export function failureDescription(code:string){return ({review_ai_allowance:'The monthly AI allowance has been used. Saved reviews and replies are preserved. Drafting waits for the allowance reset; changing the package requires an explicit account decision.',review_access_unavailable:'Review drafting cannot run because this location does not currently have active service access. Check its licence or testing expiry. Saved reviews and replies are preserved.'} as Record<string,string>)[code]||'';}
export async function adminFailureNotifications(sql=neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!)){
 const rows=await sql`SELECT f.id,f.code,f.last_seen,f.occurrences,f.path,c.email,b.business_name,count(*) OVER() AS active_count
 FROM client_failures f LEFT JOIN customers c ON c.id=f.customer_id LEFT JOIN businesses b ON b.id=f.business_id
 WHERE f.resolved_at IS NULL ORDER BY f.last_seen DESC,f.id LIMIT 20`;
 return {count:Number(rows[0]?.active_count||0),items:rows.map(r=>({id:r.id,title:failureTitle(String(r.code)),client:r.email||'System',location:r.business_name||'Account-wide',lastSeen:r.last_seen,occurrences:Number(r.occurrences),path:r.path,href:'/admin/client-failures/'+encodeURIComponent(String(r.id))}))};
}
