import {z} from 'zod';
import {authorizedLink,clientFor,liveDb,LiveReviewError} from './google-business/live-reviews';
import {gridSettingsSchema} from './heatmap-data';
import type {ReviewActor} from './review-workspaces';

export const heatmapMutation=z.discriminatedUnion('action',[
 z.object({action:z.literal('initialize'),businessId:z.string().uuid(),center:z.object({latitude:z.number().min(-80).max(80),longitude:z.number().min(-180).max(180)}).strict().optional()}).strict(),
 z.object({action:z.literal('create'),businessId:z.string().uuid(),settings:gridSettingsSchema}).strict(),
 z.object({action:z.literal('update'),businessId:z.string().uuid(),id:z.string().uuid(),version:z.number().int().positive(),settings:gridSettingsSchema,active:z.boolean()}).strict(),
]);
const email=(actor:ReviewActor)=>actor.kind==='customer'?actor.email.trim().toLowerCase():'';

export async function heatmapSnapshot(actor:ReviewActor,businessId:string,sql=liveDb()){
 const link=await authorizedLink(actor,businessId,sql);
 if(!link.enabled)throw new LiveReviewError('Google access is stopped. Reconnect this location to manage its tracking.');
 const anchors=await sql`SELECT anchor,synced_at FROM local_heatmap_locations WHERE business_id=${businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject}`;
 const tracks=await sql`SELECT id,keyword,settings,active,version,updated_at FROM local_heatmap_tracks WHERE business_id=${businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} ORDER BY active DESC,slot`;
 return {anchor:anchors[0]?{...anchors[0].anchor,synced_at:anchors[0].synced_at}:null,tracks:tracks.map(t=>({...t.settings,id:t.id,keyword:t.keyword,active:t.active,version:t.version,updated_at:t.updated_at})),provider:{connected:false,status:'not_connected'},scans:[]};
}

export async function mutateHeatmap(actor:ReviewActor,raw:unknown,sql=liveDb(),makeClient=clientFor){
 const input=heatmapMutation.parse(raw),link=await authorizedLink(actor,input.businessId,sql);
 if(!link.enabled)throw new LiveReviewError('Google access is stopped.');
 if(input.action==='initialize'){
  const existing=await sql`SELECT business_id FROM local_heatmap_locations WHERE business_id=${input.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject}`;
  if(existing.length)return {initialized:true};
  const client=await makeClient(String(link.owner)),google=await client.getMapAnchor(String(link.parent).split('/').slice(-2).join('/'));
  const hasPin=google.latitude!==undefined&&google.longitude!==undefined;
  const anchor={...google,latitude:hasPin?google.latitude:input.center?.latitude,longitude:hasPin?google.longitude:input.center?.longitude,centerSource:hasPin?'google_api':'selected'};
  if(anchor.latitude===undefined||anchor.longitude===undefined||!anchor.placeId)throw new LiveReviewError('Google did not return a map pin. Use “Set tracking center” below to enter the latitude and longitude from this location’s Google Maps pin.');
  const rows=await sql`INSERT INTO local_heatmap_locations (business_id,customer_id,parent,google_subject,anchor)
   SELECT l.business_id,l.customer_id,l.parent,l.google_subject,${JSON.stringify(anchor)}::jsonb FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
   WHERE l.business_id=${input.businessId} AND l.customer_id=b.customer_id AND l.customer_id=${link.customer_id} AND l.parent=${link.parent} AND l.google_subject=${link.google_subject} AND l.enabled AND c.account_status='active'
   AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) ON CONFLICT (business_id) DO NOTHING RETURNING business_id`;
  if(!rows.length)throw new LiveReviewError('This Google assignment changed. Reload or ask Tap Rater to check the location.');
  return {initialized:true};
 }
 if(input.action==='create'){
  const rows=await sql`INSERT INTO local_heatmap_tracks (business_id,customer_id,parent,google_subject,slot,keyword,settings)
   SELECT a.business_id,a.customer_id,a.parent,a.google_subject,s.slot,${input.settings.keyword},${JSON.stringify(input.settings)}::jsonb
   FROM local_heatmap_locations a JOIN businesses b ON b.id=a.business_id JOIN customers c ON c.id=b.customer_id
   JOIN google_review_links l ON l.business_id=a.business_id AND l.customer_id=a.customer_id AND l.parent=a.parent AND l.google_subject=a.google_subject
   CROSS JOIN LATERAL (SELECT n AS slot FROM generate_series(1,20) n WHERE NOT EXISTS (SELECT 1 FROM local_heatmap_tracks t WHERE t.business_id=a.business_id AND t.slot=n) ORDER BY n LIMIT 1) s
   WHERE a.business_id=${input.businessId} AND a.customer_id=b.customer_id AND a.customer_id=${link.customer_id} AND a.parent=${link.parent} AND a.google_subject=${link.google_subject}
   AND l.enabled AND c.account_status='active' AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)})
   ON CONFLICT DO NOTHING RETURNING id`;
  if(!rows.length)throw new LiveReviewError('Import the Google map pin first. Keywords must be unique, with up to 20 per location. Reload if another edit was just saved.');
  return {id:rows[0].id,saved:true,published:false};
 }
 // Settings and pause/resume are internal tracking preferences, never Google profile updates.
 try{
  const rows=await sql`UPDATE local_heatmap_tracks t SET keyword=${input.settings.keyword},settings=${JSON.stringify(input.settings)}::jsonb,active=${input.active},version=t.version+1,updated_at=now()
   FROM businesses b,customers c,google_review_links l WHERE t.id=${input.id} AND t.business_id=${input.businessId} AND t.version=${input.version}
   AND t.customer_id=${link.customer_id} AND t.parent=${link.parent} AND t.google_subject=${link.google_subject}
   AND b.id=t.business_id AND b.customer_id=t.customer_id AND c.id=b.customer_id AND c.account_status='active'
   AND l.business_id=t.business_id AND l.customer_id=t.customer_id AND l.parent=t.parent AND l.google_subject=t.google_subject AND l.enabled
   AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) RETURNING t.id`;
  if(!rows.length)throw new LiveReviewError('This tracking setup changed. Reload before saving.');
  return {id:rows[0].id,saved:true,published:false};
 }catch(e){if((e as {code?:string}).code==='23505')throw new LiveReviewError('This location already tracks that keyword.');throw e;}
}
