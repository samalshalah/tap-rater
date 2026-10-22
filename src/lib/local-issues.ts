import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {authorizedLink,liveDb,LiveReviewError} from './google-business/live-reviews';
import {profileSnapshot} from './google-business/profile-management';
import {heatmapSnapshot} from './heatmap-management';
import {detectLocalIssues,type Finding} from './local-issue-rules';
import {generateIssueDraft} from './local-issue-ai';
import type {ReviewActor} from './review-workspaces';
const email=(actor:ReviewActor)=>actor.kind==='customer'?actor.email.toLowerCase():'';
export const issueMutation=z.object({action:z.enum(['read','request','preview','approveDraft']),businessId:z.string().uuid(),id:z.string().uuid(),fingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export async function syncLocationIssues(actor:ReviewActor,businessId:string,sql=liveDb()){
 const link=await authorizedLink(actor,businessId,sql);
 let findings:Finding[]=[];let observed:unknown=null;
 if(!link.enabled)findings=[{code:'connection',kind:'system',title:'Google connection is stopped',evidence:'This location’s Google access is disabled in Tap Rater.',improvement:'Reconnect the location before requesting an AI draft or refreshing data.',aiEligible:false,source:'Tap Rater connection status'}];
 else {
  const [profile,heatmap]=await Promise.all([profileSnapshot(actor,businessId,sql),heatmapSnapshot(actor,businessId,sql)]);
  observed=profile.profile?.observed;
  findings=detectLocalIssues(profile.profile as any,heatmap.tracks as any,heatmap.scans as any);
  const notes=await sql`SELECT finding FROM local_issue_notes WHERE business_id=${businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND active`;
  findings.push(...notes.map(n=>n.finding as Finding));
 }
 for(const finding of findings){
  const fingerprint=createHash('sha256').update(JSON.stringify({finding,...(finding.kind==='profile'?{observed}:{})})).digest('hex');
  await sql`INSERT INTO local_issues(business_id,customer_id,parent,google_subject,code,fingerprint,finding)
   VALUES(${businessId},${link.customer_id},${link.parent},${link.google_subject},${finding.code},${fingerprint},${JSON.stringify(finding)}::jsonb)
   ON CONFLICT(business_id,parent,google_subject,code) DO UPDATE SET finding=EXCLUDED.finding,fingerprint=EXCLUDED.fingerprint,active=true,
    read_at=CASE WHEN local_issues.fingerprint=EXCLUDED.fingerprint AND local_issues.active THEN local_issues.read_at ELSE NULL END,
    requested_at=CASE WHEN local_issues.fingerprint=EXCLUDED.fingerprint THEN local_issues.requested_at ELSE NULL END,
    updated_at=CASE WHEN local_issues.fingerprint=EXCLUDED.fingerprint THEN local_issues.updated_at ELSE now() END
   WHERE local_issues.customer_id=EXCLUDED.customer_id`;
 }
 await sql`UPDATE local_issues SET active=false WHERE business_id=${businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND NOT(code=ANY(${findings.map(f=>f.code)}::text[]))`;
}
export async function localIssueSnapshot(actor:ReviewActor,businessId?:string,sql=liveDb()){
 const locations=await sql`SELECT b.id,b.business_name FROM businesses b JOIN customers c ON c.id=b.customer_id JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=b.customer_id JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
  WHERE c.account_status='active' AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) AND (${businessId??null}::uuid IS NULL OR b.id=${businessId??null}::uuid) ORDER BY b.business_name LIMIT 100`;
 const errors:string[]=[];
 for(const location of locations)try{await syncLocationIssues(actor,location.id,sql);}catch{errors.push(location.business_name);}
 const issues=await sql`SELECT i.*,b.business_name,coalesce(a.preview_enabled,false) AS preview_enabled,d.id AS draft_id,d.status AS draft_status,d.content AS draft,d.approved_at
  FROM local_issues i JOIN businesses b ON b.id=i.business_id AND b.customer_id=i.customer_id JOIN customers c ON c.id=b.customer_id
  JOIN google_review_links l ON l.business_id=i.business_id AND l.customer_id=i.customer_id AND l.parent=i.parent AND l.google_subject=i.google_subject
  LEFT JOIN local_issue_access a ON a.business_id=i.business_id AND a.customer_id=i.customer_id AND a.parent=i.parent AND a.google_subject=i.google_subject
  LEFT JOIN local_issue_drafts d ON d.issue_id=i.id AND d.fingerprint=i.fingerprint
  WHERE i.active AND c.account_status='active' AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) AND (${businessId??null}::uuid IS NULL OR b.id=${businessId??null}::uuid)
  ORDER BY i.read_at NULLS FIRST,i.updated_at DESC`;
 return {issues,locations,errors,pricing:'not_configured',publishingEnabled:false};
}
export async function mutateIssue(actor:ReviewActor,raw:unknown,sql=liveDb(),generate=generateIssueDraft){
 const input=issueMutation.parse(raw),link=await authorizedLink(actor,input.businessId,sql);
 await syncLocationIssues(actor,input.businessId,sql);
 const [issue]=await sql`SELECT * FROM local_issues WHERE id=${input.id} AND business_id=${input.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND fingerprint=${input.fingerprint} AND active`;
 if(!issue)throw new LiveReviewError('This notification changed. Refresh before continuing.',409);
 if(input.action==='read'){await sql`UPDATE local_issues SET read_at=now() WHERE id=${issue.id} AND fingerprint=${input.fingerprint}`;return {reviewed:true};}
 if(!issue.finding.aiEligible||!link.enabled)throw new LiveReviewError('This issue needs a manual check, not an AI fix.');
 if(input.action==='request'){await sql`UPDATE local_issues SET requested_at=now(),read_at=now() WHERE id=${issue.id} AND fingerprint=${input.fingerprint}`;return {requested:true,charged:false};}
 if(input.action==='approveDraft'){
  const rows=await sql`UPDATE local_issue_drafts SET approved_at=now() WHERE issue_id=${issue.id} AND fingerprint=${input.fingerprint} AND status='draft' RETURNING id`;
  if(!rows.length)throw new LiveReviewError('Generate and review the draft first.');return {approved:true,published:false,charged:false};
 }
 const [existing]=await sql`SELECT status,content FROM local_issue_drafts WHERE issue_id=${issue.id} AND fingerprint=${input.fingerprint}`;
 if(existing?.status==='draft')return {draft:existing.content,charged:false};
 const [access]=await sql`UPDATE local_issue_access SET ai_day=current_date,ai_calls=CASE WHEN ai_day=current_date THEN ai_calls+1 ELSE 1 END,ai_last_at=now()
  WHERE business_id=${input.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND preview_enabled
  AND (ai_day IS DISTINCT FROM current_date OR ai_calls<10) AND (ai_last_at IS NULL OR ai_last_at<now()-interval '15 seconds') RETURNING business_id`;
 if(!access)throw new LiveReviewError('AI preview is not enabled or its test limit was reached. Requests are saved without charge.',429);
 const attempt=randomUUID();
 const claimed=await sql`INSERT INTO local_issue_drafts(issue_id,fingerprint,status,attempt_token) VALUES(${issue.id},${input.fingerprint},'generating',${attempt})
  ON CONFLICT(issue_id,fingerprint) DO UPDATE SET status='generating',attempt_at=now(),attempt_token=EXCLUDED.attempt_token WHERE local_issue_drafts.status='failed' OR (local_issue_drafts.status='generating' AND local_issue_drafts.attempt_at<now()-interval '3 minutes') RETURNING id,attempt_at`;
 if(!claimed.length)throw new LiveReviewError('A draft is already being prepared. Refresh shortly.');
 try{
  const {profile}=await profileSnapshot(actor,input.businessId,sql);
  const draft=await generate({business:link.business_name,issue:issue.finding,verifiedGoogleFacts:profile?.observed??{}});
  if(issue.code!=='profile-description')draft.proposedDescription='';
  const rows=await sql`UPDATE local_issue_drafts d SET status='draft',content=${JSON.stringify(draft)}::jsonb FROM local_issues i,businesses b,customers c,google_review_links l
   WHERE d.id=${claimed[0].id} AND d.attempt_token=${attempt} AND d.status='generating' AND i.id=d.issue_id AND i.active AND i.fingerprint=d.fingerprint
   AND b.id=i.business_id AND b.customer_id=i.customer_id AND c.id=b.customer_id AND c.account_status='active'
   AND l.business_id=b.id AND l.customer_id=i.customer_id AND l.parent=i.parent AND l.google_subject=i.google_subject AND l.enabled
   AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) RETURNING d.id`;
  if(!rows.length)throw new LiveReviewError('The location or issue changed. The draft was not saved.');
  await sql`UPDATE local_issues SET requested_at=now(),read_at=now() WHERE id=${issue.id} AND fingerprint=${input.fingerprint}`;
  return {draft,charged:false,published:false};
 }catch(e){await sql`UPDATE local_issue_drafts SET status='failed' WHERE id=${claimed[0].id} AND attempt_token=${attempt} AND status='generating'`;throw new LiveReviewError(e instanceof LiveReviewError?e.message:'AI preview was unavailable. No charge was made. Try again later.',503);}
}
