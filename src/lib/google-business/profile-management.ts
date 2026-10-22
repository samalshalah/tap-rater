import {z} from 'zod';
import {authorizedLink,clientFor,liveDb,LiveReviewError} from './live-reviews';
import {profileFields,reportingRange,summarizePerformance} from './profile-data';
import type {ReviewActor} from '../review-workspaces';
export const profileMutation=z.discriminatedUnion('action',[
 z.object({action:z.literal('refresh'),businessId:z.string().uuid()}).strict(),
 z.object({action:z.literal('save'),businessId:z.string().uuid(),version:z.number().int().positive(),draft:profileFields}).strict()
]);
export async function profileSnapshot(actor:ReviewActor,businessId:string,sql=liveDb()){
 const link=await authorizedLink(actor,businessId,sql);if(!link.enabled)throw new LiveReviewError('Google access is stopped.');
 const rows=await sql`SELECT observed,draft,version,synced_at,updated_at FROM google_profile_drafts WHERE business_id=${businessId} AND parent=${link.parent} AND google_subject=${link.google_subject}`;
 return {profile:rows[0]||null};
}
export async function mutateProfile(actor:ReviewActor,input:z.infer<typeof profileMutation>,sql=liveDb(),makeClient=clientFor){
 const link=await authorizedLink(actor,input.businessId,sql);if(!link.enabled)throw new LiveReviewError('Google access is stopped.');
 if(input.action==='save'){
  const rows=await sql`UPDATE google_profile_drafts p SET draft=${JSON.stringify(input.draft)}::jsonb,version=p.version+1,updated_at=now()
   FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
   WHERE p.business_id=${input.businessId} AND p.version=${input.version} AND p.parent=${link.parent} AND p.google_subject=${link.google_subject}
   AND l.business_id=p.business_id AND l.parent=p.parent AND l.google_subject=p.google_subject AND l.enabled AND c.account_status='active'
   AND (${actor.kind==='admin'} OR lower(c.email)=${actor.kind==='customer'?actor.email.toLowerCase():''}) RETURNING p.version`;
  if(!rows.length)throw new LiveReviewError('This location changed. Reload before saving your draft.');return {saved:true,published:false};
 }
 const client=await makeClient(String(link.owner));const observed=await client.getProfile(String(link.parent).split('/').slice(-2).join('/'));
 const rows=await sql`INSERT INTO google_profile_drafts (business_id,parent,google_subject,observed)
 SELECT l.business_id,l.parent,l.google_subject,${JSON.stringify(observed)}::jsonb FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
 WHERE l.business_id=${input.businessId} AND l.parent=${link.parent} AND l.google_subject=${link.google_subject} AND l.enabled AND c.account_status='active'
 AND (${actor.kind==='admin'} OR lower(c.email)=${actor.kind==='customer'?actor.email.toLowerCase():''})
 ON CONFLICT (business_id) DO UPDATE SET observed=EXCLUDED.observed,synced_at=now(),version=google_profile_drafts.version+1
 WHERE google_profile_drafts.parent=EXCLUDED.parent AND google_profile_drafts.google_subject=EXCLUDED.google_subject RETURNING version`;
 if(!rows.length)throw new LiveReviewError('The Google assignment changed. Ask Tap Rater to check this location.');
 return {refreshed:true,published:false};
}
export async function locationPerformance(actor:ReviewActor,businessId:string,days:number,sql=liveDb(),makeClient=clientFor){
 if(![7,28,90].includes(days))throw new LiveReviewError('Choose 7, 28 or 90 days.',400);
 const link=await authorizedLink(actor,businessId,sql);if(!link.enabled)throw new LiveReviewError('Google access is stopped.');
 const range=reportingRange(days),client=await makeClient(String(link.owner));
 const raw=await client.getPerformance(String(link.parent).split('/').slice(-2).join('/'),range.start,range.end);
 const current=await authorizedLink(actor,businessId,sql);
 if(!current.enabled||current.parent!==link.parent||current.google_subject!==link.google_subject)throw new LiveReviewError('The Google assignment changed. Reload this location.');
 return {range,metrics:summarizePerformance(raw,range),fetchedAt:new Date().toISOString()};
}
