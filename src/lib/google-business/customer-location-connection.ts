import {liveDb,LiveReviewError} from './live-reviews';
export const customerLocationFlowCookie='taprater_google_location_flow';
export const locationConnectionOwner=(owner:string,businessId:string)=>`${owner}:location:${businessId}`;
export async function customerLocationConnection(identity:{owner:string;email:string},businessId:string,sql=liveDb()){
 const owner=locationConnectionOwner(identity.owner,businessId);
 const rows=await sql`SELECT b.id,coalesce(g.owner,CASE WHEN l.enabled THEN l.owner END) AS connection_owner
 FROM businesses b JOIN customers c ON c.id=b.customer_id
 LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=b.customer_id
 LEFT JOIN google_business_connections g ON g.owner=${owner}
 WHERE b.id=${businessId}::uuid AND lower(c.email)=${identity.email} AND c.account_status='active' AND b.status IS DISTINCT FROM 'marketing_removed'`;
 if(!rows.length)throw new LiveReviewError('Choose a location from your account.',404);
 return {owner,connectionOwner:rows[0].connection_owner?String(rows[0].connection_owner):owner};
}
