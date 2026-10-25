import {liveDb} from './google-business/live-reviews';
import {createRankProvider} from './dataforseo';

/** Only GET existing tasks. Never creates tasks, releases reservations, or retries paid work. */
export async function recoverHeatmapScan(businessId:string,link:{customer_id:unknown;parent:unknown;google_subject:unknown},sql=liveDb(),provider=createRankProvider()){
 const points=await sql`SELECT p.id,p.provider_id,r.anchor FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id WHERE r.business_id=${businessId} AND r.customer_id=${link.customer_id} AND r.parent=${link.parent} AND r.google_subject=${link.google_subject} AND r.created_at>now()-interval '29 days' AND p.state IN ('pending','uncertain') AND p.provider_id IS NOT NULL ORDER BY p.checked_at NULLS FIRST LIMIT 100`;
 let recovered=0;const codes=new Set<string>();
 for(let offset=0;offset<points.length;offset+=10)await Promise.all(points.slice(offset,offset+10).map(async p=>{
  try{
   const result=await provider.collect(String(p.provider_id),String(p.anchor.placeId));
   if(result.code)codes.add(result.code);
   const written=await sql`UPDATE local_rank_points p SET state=${result.state},rank=${result.rank??null},result_count=${result.count??null},competitors=${result.competitors?JSON.stringify(result.competitors):null}::jsonb,error_code=${result.code??null},checked_at=now() FROM local_rank_runs r,google_review_links l WHERE p.id=${p.id} AND p.run_id=r.id AND p.state IN ('pending','uncertain') AND r.business_id=${businessId} AND r.customer_id=${link.customer_id} AND r.parent=${link.parent} AND r.google_subject=${link.google_subject} AND l.business_id=r.business_id AND l.customer_id=r.customer_id AND l.parent=r.parent AND l.google_subject=r.google_subject AND l.enabled RETURNING p.id`;
   if(result.state==='complete')recovered+=written.length;
  }catch{codes.add('retrieval_unavailable');}
 }));
 return {recovered,codes:[...codes],providerCost:0};
}
