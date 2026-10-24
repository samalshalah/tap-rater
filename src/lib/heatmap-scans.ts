import {liveDb} from './google-business/live-reviews';
import {weeklyScanPeriod} from './heatmap-schedule';
import {buildGrid,gridSettingsSchema} from './heatmap-data';
import {createRankProvider,providerConfigured,rankRequest,scanPeriod,POINT_COST_MICROUSD} from './dataforseo';

/** Called only by the authenticated cron route. No Google write methods are used. */
export async function runHeatmapMaintenance(sql=liveDb(),provider=createRankProvider(),now=new Date()){
 if(!providerConfigured())return {status:'credentials_required',submitted:0,collected:0};
 const [config]=await sql`SELECT enabled,halt_reason FROM local_rank_provider WHERE id=true`;
 if(!config)return {status:'setup_required',submitted:0,collected:0};
 // Unknown outcomes retain their entire reservation and are never automatically paid for again.
 await sql`UPDATE local_rank_points SET state='uncertain',error_code='submission_interrupted' WHERE state='submitting' AND submitted_at<now()-interval '10 minutes'`;
 let collected=0;
 const pending=await sql`SELECT p.id,p.provider_id,r.anchor FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id WHERE p.state='pending' ORDER BY p.checked_at NULLS FIRST LIMIT 100`;
 // Retrieval is free and continues even when paid submissions are disabled or capped.
 for(let offset=0;offset<pending.length;offset+=10)await Promise.all(pending.slice(offset,offset+10).map(async p=>{
  try{
   const result=await provider.collect(String(p.provider_id),String(p.anchor.placeId));
   await sql`UPDATE local_rank_points SET state=${result.state},rank=${result.rank??null},result_count=${result.count??null},competitors=${result.competitors?JSON.stringify(result.competitors):null}::jsonb,error_code=${result.code??null},checked_at=now() WHERE id=${p.id} AND state='pending'`;
   if(result.state==='complete')collected++;
  }catch{await sql`UPDATE local_rank_points SET checked_at=now(),error_code='retrieval_unavailable' WHERE id=${p.id} AND state='pending'`;}
 }));
 if(!config.enabled||config.halt_reason)return {status:config.halt_reason?'halted':'disabled',submitted:0,collected};
 const period=scanPeriod(now),weeklyPeriod=weeklyScanPeriod(now);
 const locations=await sql`SELECT a.*,CASE WHEN s.cadence='weekly' THEN ${weeklyPeriod}::date ELSE ${period}::date END AS scan_period,coalesce(jsonb_agg(jsonb_build_object('id',t.id,'version',t.version,'settings',t.settings) ORDER BY t.slot) FILTER(WHERE t.id IS NOT NULL),'[]'::jsonb) AS tracks
  FROM local_rank_schedules s JOIN local_heatmap_locations a ON a.business_id=s.business_id AND a.customer_id=s.customer_id AND a.parent=s.parent AND a.google_subject=s.google_subject
  JOIN businesses b ON b.id=a.business_id AND b.customer_id=a.customer_id JOIN customers c ON c.id=b.customer_id AND c.account_status='active'
  JOIN google_review_links l ON l.business_id=a.business_id AND l.customer_id=a.customer_id AND l.parent=a.parent AND l.google_subject=a.google_subject AND l.enabled
  JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
  LEFT JOIN local_heatmap_tracks t ON t.business_id=a.business_id AND t.customer_id=a.customer_id AND t.parent=a.parent AND t.google_subject=a.google_subject AND t.active
  WHERE s.enabled AND marketing_location_allowed(a.business_id) AND EXISTS(SELECT 1 FROM customer_marketing_access ma WHERE ma.customer_id=c.id AND ma.status IN ('active','testing') AND (ma.expires_at IS NULL OR ma.expires_at>now()))
  AND NOT EXISTS(SELECT 1 FROM local_rank_runs r WHERE r.business_id=a.business_id AND r.customer_id=a.customer_id AND r.parent=a.parent AND r.google_subject=a.google_subject AND r.period=CASE WHEN s.cadence='weekly' THEN ${weeklyPeriod}::date ELSE ${period}::date END)
  AND (s.cadence<>'weekly' OR (SELECT count(*) FROM local_rank_runs r WHERE r.business_id=a.business_id AND r.customer_id=a.customer_id AND r.parent=a.parent AND r.google_subject=a.google_subject AND r.request_key='scheduled' AND date_trunc('month',r.created_at AT TIME ZONE 'America/New_York')=date_trunc('month',${now.toISOString()}::timestamptz AT TIME ZONE 'America/New_York'))<4)
  GROUP BY a.business_id,s.cadence ORDER BY a.business_id LIMIT 20`;
 let invalid=0;
 for(const location of locations){
  try{
   if(!location.tracks.length)continue;
   const points=location.tracks.flatMap((t:{id:string;settings:unknown})=>{
    const settings=gridSettingsSchema.parse(t.settings);
    return buildGrid(location.anchor.latitude,location.anchor.longitude,settings.size,settings.spacingKm).map(p=>({track_id:t.id,point_index:p.index,request:rankRequest(settings,p)}));
   });
   await sql`WITH run AS (
    INSERT INTO local_rank_runs(business_id,customer_id,parent,google_subject,period,anchor,tracks,methodology)
    VALUES(${location.business_id},${location.customer_id},${location.parent},${location.google_subject},${location.scan_period}::date,${JSON.stringify(location.anchor)}::jsonb,${JSON.stringify(location.tracks)}::jsonb,'maps-v2')
    ON CONFLICT(business_id,period,methodology,request_key) DO NOTHING RETURNING id
   ) INSERT INTO local_rank_points(run_id,track_id,point_index,request)
    SELECT run.id,p.track_id,p.point_index,p.request FROM run CROSS JOIN jsonb_to_recordset(${JSON.stringify(points)}::jsonb) AS p(track_id uuid,point_index smallint,request jsonb)`;
  }catch{invalid++;}
 }
 const claimed=await sql`SELECT * FROM claim_local_rank_points()`;
 if(!claimed.length)return {status:'idle_or_capped',submitted:0,collected,invalid};
 let submitted=0;
 try{
  const results=await provider.submit(claimed.map(p=>({id:String(p.id),request:p.request})));
  for(const result of results){
   // Stop all subsequent paid work if the provider's charged rate changes.
   if(result.cost!==undefined&&result.cost>POINT_COST_MICROUSD)await sql`UPDATE local_rank_provider SET enabled=false,halt_reason='provider_price_changed',updated_at=now() WHERE id=true`;
   await sql`UPDATE local_rank_points SET state=${result.state},provider_id=${result.providerId??null},actual_microusd=${result.cost??null},error_code=${result.state==='uncertain'?'submission_unconfirmed':null} WHERE id=${result.id} AND state='submitting'`;
   if(result.state==='pending')submitted++;
  }
 }catch{
  await sql`UPDATE local_rank_points SET state='uncertain',error_code='submission_unconfirmed' WHERE id=ANY(${claimed.map(p=>p.id)}::uuid[]) AND state='submitting'`;
 }
 return {status:'processed',submitted,collected,invalid};
}
