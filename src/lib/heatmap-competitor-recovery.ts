import {liveDb,LiveReviewError} from './google-business/live-reviews';
import {createRankProvider} from './dataforseo';

/** Retrieves existing task results only. Never submits a paid task or changes scan settings. */
export async function recoverHeatmapCompetitors(input:{businessId:string;runId:string;trackId:string},link:{customer_id:unknown;parent:unknown;google_subject:unknown},sql=liveDb(),provider=createRankProvider()){
 const runs=await sql`SELECT id,anchor FROM local_rank_runs WHERE id=${input.runId} AND business_id=${input.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND EXISTS(SELECT 1 FROM jsonb_array_elements(tracks) t WHERE t->>'id'=${input.trackId}) AND created_at>now()-interval '29 days'`;
 if(!runs.length)throw new LiveReviewError('This scan is unavailable or too old to retrieve. Review the cost of a new scan instead.',404);
 const points=await sql`SELECT id,provider_id FROM local_rank_points WHERE run_id=${input.runId} AND track_id=${input.trackId} AND state='complete' AND competitors IS NULL AND provider_id IS NOT NULL ORDER BY point_index LIMIT 49`;
 let recovered=0,unavailable=0;
 for(let offset=0;offset<points.length;offset+=10)await Promise.all(points.slice(offset,offset+10).map(async p=>{
  try{
   const result=await provider.collect(String(p.provider_id),String(runs[0].anchor.placeId));
   if(result.state!=='complete'||!result.competitors){unavailable++;return;}
   // Recheck the assignment at write time; an in-flight response cannot migrate to a new owner.
   const written=await sql`UPDATE local_rank_points p SET competitors=${JSON.stringify(result.competitors)}::jsonb FROM local_rank_runs r,google_review_links l WHERE p.id=${p.id} AND p.run_id=r.id AND r.id=${input.runId} AND p.track_id=${input.trackId} AND p.competitors IS NULL AND r.business_id=${input.businessId} AND r.customer_id=${link.customer_id} AND r.parent=${link.parent} AND r.google_subject=${link.google_subject} AND l.business_id=r.business_id AND l.customer_id=r.customer_id AND l.parent=r.parent AND l.google_subject=r.google_subject AND l.enabled RETURNING p.id`;
   recovered+=written.length;
  }catch{unavailable++;}
 }));
 return {recovered,unavailable,providerCost:0,published:false};
}
