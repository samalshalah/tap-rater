import {neon} from '@neondatabase/serverless';
export function failureTitle(code:string){return code.replace(/[_-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());}
export async function adminFailureNotifications(sql=neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!)){
 const rows=await sql`SELECT f.id,f.code,f.last_seen,f.occurrences,f.path,c.email,b.business_name,count(*) OVER() AS active_count
 FROM client_failures f LEFT JOIN customers c ON c.id=f.customer_id LEFT JOIN businesses b ON b.id=f.business_id
 WHERE f.resolved_at IS NULL ORDER BY f.last_seen DESC,f.id LIMIT 20`;
 return {count:Number(rows[0]?.active_count||0),items:rows.map(r=>({id:r.id,title:failureTitle(String(r.code)),client:r.email||'System',location:r.business_name||'Account-wide',lastSeen:r.last_seen,occurrences:Number(r.occurrences),path:r.path,href:'/admin/client-failures/'+encodeURIComponent(String(r.id))}))};
}
