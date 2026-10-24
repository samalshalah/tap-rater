import {liveDb} from './google-business/live-reviews';
export type NavigationLocation={id:string;name:string;address:string};
export async function customerNavigationLocations(email:string,sql=liveDb()):Promise<NavigationLocation[]>{
 const rows=await sql`SELECT b.id,b.business_name,b.address FROM businesses b JOIN customers c ON c.id=b.customer_id
 WHERE lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active' AND b.status IS DISTINCT FROM 'marketing_removed'
 ORDER BY b.business_name,b.address,b.id`;
 return rows.map(b=>({id:String(b.id),name:String(b.business_name),address:String(b.address||'')}));
}
