import {heatmapFeatureEnabled} from '@/lib/heatmap-feature';
import {authorizedLink,liveDb,LiveReviewError} from './google-business/live-reviews';
import {buildGrid,gridSettingsSchema} from './heatmap-data';
import {POINT_COST_MICROUSD,rankRequest,scanPeriod,providerConfigured} from './dataforseo';
import type {ReviewActor} from './review-workspaces';

type Input={action:'quote';businessId:string;id:string;version:number}|{action:'approve';businessId:string;quoteId:string};
export async function mutateScanApproval(actor:ReviewActor,input:Input,sql=liveDb()){
 if(!heatmapFeatureEnabled)throw new LiveReviewError('Heat-map scans are temporarily paused. Saved results are preserved.',423);
 const link=await authorizedLink(actor,input.businessId,sql);
 if(!link.enabled||!providerConfigured())throw new LiveReviewError('Connect Google and the ranking provider first.');
 const [schedule]=await sql`SELECT manual_enabled FROM local_rank_schedules WHERE business_id=${input.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND enabled`;
 if(!schedule?.manual_enabled)throw new LiveReviewError('Additional scans are not enabled for this location. Contact Tap Rater.',403);
 if(input.action==='quote'){
  const rows=await sql`INSERT INTO local_rank_quotes(business_id,customer_id,parent,google_subject,track_id,version,settings,anchor,cost_microusd)
   SELECT t.business_id,t.customer_id,t.parent,t.google_subject,t.id,t.version,t.settings,a.anchor,(t.settings->>'size')::int*(t.settings->>'size')::int*${POINT_COST_MICROUSD}
   FROM local_heatmap_tracks t JOIN local_heatmap_locations a ON a.business_id=t.business_id AND a.customer_id=t.customer_id AND a.parent=t.parent AND a.google_subject=t.google_subject
   WHERE t.id=${input.id} AND t.business_id=${input.businessId} AND t.version=${input.version} AND t.active AND t.customer_id=${link.customer_id} AND t.parent=${link.parent} AND t.google_subject=${link.google_subject}
   RETURNING id,cost_microusd,settings,expires_at`;
  if(!rows.length)throw new LiveReviewError('Tracking settings changed or the keyword is paused. Reload before requesting a scan.');
  return {quote:{id:rows[0].id,cost:Number(rows[0].cost_microusd)/1e6,settings:rows[0].settings,expiresAt:rows[0].expires_at}};
 }
 const [q]=await sql`SELECT * FROM local_rank_quotes WHERE id=${input.quoteId} AND business_id=${input.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject}`;
 if(!q)throw new LiveReviewError('Scan quote not found.',404);
 // A lost approval response can safely be repeated, without creating another billable run.
 if(q.approved_at)return {approved:true,duplicate:true};
 const settings=gridSettingsSchema.parse(q.settings);
 const points=buildGrid(q.anchor.latitude,q.anchor.longitude,settings.size,settings.spacingKm).map(p=>({point_index:p.index,request:rankRequest(settings,p)}));
 if(q.cost_microusd!==points.length*POINT_COST_MICROUSD)throw new LiveReviewError('Scan price changed. Request a new quote.');
 const tracks=[{id:q.track_id,version:q.version,settings}];
 const rows=await sql`WITH approved AS (
  UPDATE local_rank_quotes q SET approved_at=now() FROM local_heatmap_tracks t,local_rank_provider cfg,local_rank_schedules s,google_review_links l,businesses b,customers c
  WHERE q.id=${input.quoteId} AND q.business_id=${input.businessId} AND q.customer_id=${link.customer_id} AND q.parent=${link.parent} AND q.google_subject=${link.google_subject}
  AND q.approved_at IS NULL AND q.expires_at>now() AND t.id=q.track_id AND t.version=q.version AND t.settings=q.settings AND t.active
  AND t.business_id=q.business_id AND t.customer_id=q.customer_id AND t.parent=q.parent AND t.google_subject=q.google_subject
  AND s.business_id=q.business_id AND s.customer_id=q.customer_id AND s.parent=q.parent AND s.google_subject=q.google_subject AND s.enabled AND s.manual_enabled
  AND l.business_id=q.business_id AND l.customer_id=q.customer_id AND l.parent=q.parent AND l.google_subject=q.google_subject AND l.enabled
  AND b.id=q.business_id AND b.customer_id=q.customer_id AND c.id=b.customer_id AND c.account_status='active'
  AND (${actor.kind==='admin'} OR lower(c.email)=${actor.kind==='customer'?actor.email.toLowerCase():''})
  AND cfg.id=true AND cfg.enabled AND cfg.halt_reason IS NULL
  AND marketing_location_allowed(q.business_id)
  AND EXISTS(SELECT 1 FROM customer_marketing_access a WHERE a.customer_id=q.customer_id
   AND a.heatmap_monthly_points>=${points.length}+coalesce((SELECT sum(u.units) FROM marketing_usage_reservations u
    WHERE u.business_id=q.business_id AND u.service='heatmap' AND u.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date),0))
  AND cfg.monthly_cap_microusd>=q.cost_microusd+coalesce((SELECT reserved_microusd FROM local_rank_budgets WHERE month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date),0)
  RETURNING q.*
 ), run AS (
  INSERT INTO local_rank_runs(business_id,customer_id,parent,google_subject,period,anchor,tracks,methodology,request_key)
  SELECT business_id,customer_id,parent,google_subject,${scanPeriod()}::date,anchor,${JSON.stringify(tracks)}::jsonb,'maps-v2',id::text FROM approved RETURNING id
 ), points AS (
  INSERT INTO local_rank_points(run_id,track_id,point_index,request)
  SELECT run.id,${q.track_id}::uuid,p.point_index,p.request FROM run CROSS JOIN jsonb_to_recordset(${JSON.stringify(points)}::jsonb) AS p(point_index smallint,request jsonb) RETURNING id
 ) SELECT id FROM run`;
 if(!rows.length)throw new LiveReviewError('Quote expired, settings changed, or scan budget or location allowance is unavailable. Refresh and request a new quote.');
 return {approved:true,runId:rows[0].id,queued:true};
}
