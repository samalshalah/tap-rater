import {z} from 'zod';
import {authorizedLink,liveDb,LiveReviewError} from './google-business/live-reviews';
import {profileSnapshot} from './google-business/profile-management';
import {reviewKnowledgeSchema} from './review-knowledge-data';
import type {ReviewActor} from './review-workspaces';
export const knowledgeSave=z.object({businessId:z.string().uuid(),version:z.number().int().positive(),knowledge:reviewKnowledgeSchema,approveLowStars:z.boolean().optional()}).strict();
export async function reviewKnowledgeSnapshot(actor:ReviewActor,businessId:string,sql=liveDb()){
 const link=await authorizedLink(actor,businessId,sql);
 const {profile}=await profileSnapshot(actor,businessId,sql);
 const p=profile?.observed;
 return {businessId,businessName:link.business_name,version:Number(link.settings_version),knowledge:{...reviewKnowledgeSchema.parse(link.review_knowledge||{}),style:link.auto_style},syncedAt:profile?.synced_at||null,
 facts:p?{name:p.name,address:p.address,phone:p.phone,website:p.website,categories:p.categories,description:p.description,hours:p.hours,specialHours:p.specialHours}:null};
}
export async function saveReviewKnowledge(actor:ReviewActor,raw:unknown,sql=liveDb()){
 const v=knowledgeSave.parse(raw),link=await authorizedLink(actor,v.businessId,sql);
 if(v.approveLowStars&&!link.ai_consent)throw new LiveReviewError('Turn on AI replies before activating drafts.');
 const rows=await sql`UPDATE google_review_links SET review_knowledge_approved_at=CASE WHEN ${Boolean(v.approveLowStars)} THEN now() ELSE NULL END,draft_low_stars=${Boolean(v.approveLowStars)},review_knowledge=${JSON.stringify(v.knowledge)}::jsonb,auto_style=${v.knowledge.style},settings_version=settings_version+1
 WHERE business_id=${v.businessId} AND customer_id=${link.customer_id} AND parent=${link.parent} AND google_subject=${link.google_subject} AND enabled AND settings_version=${v.version} RETURNING settings_version`;
 if(!rows.length)throw new LiveReviewError('Settings changed. Reopen this popup before saving.',409);
 return {saved:true,version:Number(rows[0].settings_version),published:false};
}
export async function replyKnowledgeContext(businessId:string,customerId:string,sql=liveDb()){
 const [row]=await sql`SELECT l.review_knowledge,l.auto_style,p.observed FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id JOIN customers c ON c.id=b.customer_id
 JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
 LEFT JOIN google_profile_drafts p ON p.business_id=l.business_id AND p.parent=l.parent AND p.google_subject=l.google_subject
 WHERE l.business_id=${businessId} AND l.customer_id=${customerId} AND l.enabled AND c.account_status='active' AND marketing_location_allowed(b.id)`;
 if(!row)throw new LiveReviewError('This location is unavailable.',404);
 const p=row.observed;
 const recent=await sql`SELECT draft,data->'reviewReply'->>'comment' AS published FROM google_live_reviews WHERE business_id=${businessId} ORDER BY fetched_at DESC,id LIMIT 100`;
 const recentReplies=[...new Set(recent.flatMap(r=>[r.draft,r.published]).filter((v):v is string=>typeof v==='string'&&v.trim().length>0))].slice(0,12).map(v=>v.slice(0,1500));
 return {recentReplies,preferences:{...reviewKnowledgeSchema.parse(row.review_knowledge||{}),style:row.auto_style},googleFacts:p?{name:p.name,address:p.address,phone:p.phone,website:p.website,categories:p.categories,description:p.description,hours:p.hours,specialHours:p.specialHours}:null};
}
