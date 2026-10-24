import {randomUUID} from 'node:crypto';
import {authorizedLink,clientFor,liveDb,LiveReviewError} from './live-reviews';
import {GoogleBusinessError} from './client';
import {profilePublishPlan,containsSubmitted} from './profile-publish-plan';
import type {ProfileFields} from './profile-data';
import type {ReviewActor} from '../review-workspaces';

export async function publishProfile(actor:ReviewActor,input:{businessId:string;version?:number;draft?:ProfileFields;action:'publish'|'checkPublish'},sql=liveDb(),makeClient=clientFor){
 const link=await authorizedLink(actor,input.businessId,sql);
 if(!link.enabled)throw new LiveReviewError('Connect Google before publishing this profile.');
 const rows=await sql`SELECT observed,draft,version,publish_state,publish_attempt,publish_plan,updated_at FROM google_profile_drafts WHERE business_id=${input.businessId} AND parent=${link.parent} AND google_subject=${link.google_subject}`;
 const row=rows[0];if(!row)throw new LiveReviewError('Import the Google profile first.');
 const location=String(link.parent).split('/').slice(-2).join('/');
 async function complete(attempt:string,plan:ReturnType<typeof profilePublishPlan>,draft:ProfileFields){
  const saved=await sql`UPDATE google_profile_drafts SET observed=${JSON.stringify(plan.accepted)}::jsonb,draft=${plan.remaining.length?JSON.stringify(draft):null}::jsonb,publish_state='submitted',submitted_at=now(),version=version+1,updated_at=now() WHERE business_id=${input.businessId} AND publish_attempt=${attempt}::uuid AND parent=${link.parent} AND google_subject=${link.google_subject} RETURNING version`;
  if(!saved.length)throw new LiveReviewError('Google received the update, but this workspace changed. Refresh the location to check its status.');
  return {submitted:true,remaining:plan.remaining};
 }
 if(input.action==='checkPublish'){
  if(!['publishing','uncertain'].includes(row.publish_state))return {submitted:row.publish_state==='submitted'};
  if(row.publish_state==='publishing'&&Date.now()-new Date(row.updated_at).getTime()<120000)throw new LiveReviewError('Google is still processing this request. Check again shortly.');
  const stored=row.publish_plan as {plan:ReturnType<typeof profilePublishPlan>;draft:ProfileFields};
  if(!stored?.plan)throw new LiveReviewError('Contact support to check this submission.');
  const client=await makeClient(String(link.owner));const actual=await client.getProfileFields(location,stored.plan.updateMask);
  if(!containsSubmitted(actual,stored.plan.body))throw new LiveReviewError('Google has not confirmed these changes yet. Check again later or review the profile in Google. No duplicate submission was sent.');
  return complete(String(row.publish_attempt),stored.plan,stored.draft);
 }
 if(row.version!==input.version||['publishing','uncertain'].includes(row.publish_state))throw new LiveReviewError('This profile changed or has an unresolved submission. Refresh or check its publishing status.');
 let plan:ReturnType<typeof profilePublishPlan>;
 try{plan=profilePublishPlan(row.observed,input.draft!);}catch(e){throw new LiveReviewError((e as Error).message,400);}
 if(!plan.updateMask.length)throw new LiveReviewError(plan.remaining.length?'These fields cannot be published from Tap Rater yet: '+plan.remaining.join(', ')+'. Save them as a draft.':'No changes to publish.',400);
 const client=await makeClient(String(link.owner));const attempt=randomUUID();
 const claims=await sql`UPDATE google_profile_drafts p SET draft=${JSON.stringify(input.draft)}::jsonb,publish_state='publishing',publish_attempt=${attempt}::uuid,publish_plan=${JSON.stringify({plan,draft:input.draft})}::jsonb,version=p.version+1,updated_at=now()
 FROM google_review_links l JOIN businesses b ON b.id=l.business_id JOIN customers c ON c.id=b.customer_id
 WHERE p.business_id=${input.businessId} AND p.version=${input.version} AND p.publish_state NOT IN ('publishing','uncertain') AND p.parent=${link.parent} AND p.google_subject=${link.google_subject}
 AND l.business_id=p.business_id AND l.parent=p.parent AND l.google_subject=p.google_subject AND l.owner=${link.owner} AND l.enabled AND c.account_status='active'
 AND (${actor.kind==='admin'} OR lower(c.email)=${actor.kind==='customer'?actor.email.toLowerCase():''}) RETURNING p.version`;
 if(!claims.length)throw new LiveReviewError('This location changed. Reload before publishing.');
 try{
  await client.updateProfile(location,plan.body,plan.updateMask);
  return await complete(attempt,plan,input.draft!);
 }catch(e){
  const rejected=e instanceof GoogleBusinessError&&[400,401,403,404,409,422,429].includes(e.status);
  await sql`UPDATE google_profile_drafts SET publish_state=${rejected?'idle':'uncertain'} WHERE business_id=${input.businessId} AND publish_attempt=${attempt}::uuid AND publish_state='publishing'`;
  throw new LiveReviewError(rejected?'Google did not accept the update. Check your changes and Google access. Your edits are saved.':'The submission could not be confirmed. Use Check submission before trying again. Your changes are saved.',409);
 }
}
