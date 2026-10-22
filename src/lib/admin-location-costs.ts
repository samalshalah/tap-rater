import {liveDb} from './google-business/live-reviews';
export function locationCost(row:Record<string,unknown>){
 return {accountId:String(row.customer_id),id:String(row.business_id),current:Boolean(row.current_location),points:Number(row.points)||0,heat:Number(row.heat)||0,unknown:Number(row.unknown)||0};
}
export async function adminLocationCosts(sql=liveDb()){
 const rows=await sql`WITH ids AS (
 SELECT customer_id,id AS business_id FROM businesses
 UNION SELECT customer_id,business_id FROM local_rank_runs
 UNION SELECT customer_id,business_id FROM ai_usage_events
 ), costs AS (
 SELECT r.customer_id,r.business_id,count(*) AS points,coalesce(sum(p.actual_microusd),0) AS heat,
 count(*) FILTER(WHERE p.actual_microusd IS NULL AND p.reserved_microusd>0) AS unknown
 FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id
 WHERE p.budget_month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date
 GROUP BY r.customer_id,r.business_id
 ) SELECT ids.customer_id,ids.business_id,b.id IS NOT NULL AS current_location,
 coalesce(costs.points,0) AS points,coalesce(costs.heat,0) AS heat,coalesce(costs.unknown,0) AS unknown
 FROM ids LEFT JOIN businesses b ON b.id=ids.business_id AND b.customer_id=ids.customer_id
 LEFT JOIN costs ON costs.customer_id=ids.customer_id AND costs.business_id=ids.business_id
 ORDER BY ids.customer_id,ids.business_id`;
 return rows.map(locationCost);
}
