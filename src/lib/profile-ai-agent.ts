import {z} from 'zod';
import {authorizedLink,liveDb,LiveReviewError} from './google-business/live-reviews';
import {syncLocationIssues,mutateIssue} from './local-issues';
import type {ReviewActor} from './review-workspaces';
export const profileAgentSettings=z.object({businessId:z.string().uuid(),enabled:z.boolean(),version:z.number().int().positive()}).strict();
export async function saveProfileAgentSettings(actor:ReviewActor,raw:unknown,sql=liveDb()){
 const v=profileAgentSettings.parse(raw),link=await authorizedLink(actor,v.businessId,sql);
 const rows=await sql`UPDATE google_review_links SET profile_ai_enabled=${v.enabled},settings_version=settings_version+1,maintenance_due_at=CASE WHEN ${v.enabled} THEN now() ELSE maintenance_due_at END
 WHERE business_id=${v.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND enabled AND settings_version=${v.version} RETURNING settings_version`;
 if(!rows.length)throw new LiveReviewError('Settings changed. Refresh and try again.',409);
 return {...rows[0],enabled:v.enabled,published:false};
}
export async function prepareProfileAgentDraft(businessId:string,sql=liveDb(),sync=syncLocationIssues,prepare=mutateIssue){
 const actor={kind:'admin'} as const,link=await authorizedLink(actor,businessId,sql);
 if(!link.enabled||!link.profile_ai_enabled)return {drafted:false};
 await sync(actor,businessId,sql);
 const [issue]=await sql`SELECT i.id,i.fingerprint FROM local_issues i LEFT JOIN local_issue_drafts d ON d.issue_id=i.id AND d.fingerprint=i.fingerprint
 WHERE i.business_id=${businessId} AND i.customer_id=${link.customer_id} AND i.parent=${link.parent} AND i.google_subject=${link.google_subject}
 AND i.active AND i.finding->>'kind'='profile' AND i.finding->>'aiEligible'='true'
 AND (d.id IS NULL OR d.status='failed' OR (d.status='generating' AND d.attempt_at<now()-interval '3 minutes')) ORDER BY d.attempt_at NULLS FIRST,i.updated_at,i.id LIMIT 1`;
 if(!issue)return {drafted:false};
 await prepare(actor,{action:'preview',businessId,id:issue.id,fingerprint:issue.fingerprint},sql,undefined,Number(link.settings_version));
 return {drafted:true,published:false};
}
