import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import type { ReviewActor } from "./review-workspaces";
import { generateReviewSuggestions } from "./review-ai-provider";
import { eligibleForAutoReply, type AutoReplySettings, type ReplyStyle } from "./review-ai-options";
export class ReviewAiError extends Error { constructor(message:string, public status:number){super(message);} }
function db(){return neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL!);}
function email(actor:ReviewActor){return actor.kind==="customer"?actor.email.trim().toLowerCase():"";}
export const autoSettingsSchema=z.object({
 businessId:z.string().uuid(),enabled:z.boolean(),four:z.boolean(),five:z.boolean(),
 style:z.enum(["friendly","professional","personal","short"]),version:z.number().int().positive()
}).strict().refine(v=>!v.enabled || v.four || v.five);
export async function saveAutoSettings(actor:ReviewActor,input:unknown,sql=db()){
 const v=autoSettingsSchema.parse(input);
 const rows=await sql`UPDATE review_workspaces w SET auto_enabled=${v.enabled},auto_four=${v.four},auto_five=${v.five},auto_style=${v.style},
 settings_version=settings_version+1 FROM businesses b JOIN customers c ON c.id=b.customer_id
 WHERE w.business_id=b.id AND b.id=${v.businessId} AND w.mode='sample' AND w.settings_version=${v.version}
 AND (${actor.kind==="admin"} OR (lower(c.email)=${email(actor)} AND c.account_status='active'))
 RETURNING w.settings_version`;
 if(!rows.length) throw new ReviewAiError("Workspace settings changed or are unavailable. Reload and try again.",409);
 return {enabled:v.enabled,four:v.four,five:v.five,style:v.style,version:Number(rows[0].settings_version)};
}
async function reserveGeneration(businessId:string,sql=db()){
 const rows=await sql`UPDATE review_workspaces SET ai_day=current_date,
 ai_calls=CASE WHEN ai_day=current_date THEN ai_calls+1 ELSE 1 END,ai_last_at=now()
 WHERE business_id=${businessId} AND mode='sample' AND (ai_day IS DISTINCT FROM current_date OR ai_calls<20)
 AND (ai_last_at IS NULL OR ai_last_at<now()-interval '10 seconds') RETURNING business_id`;
 if(!rows.length) throw new ReviewAiError("Please wait 10 seconds between generations. The pilot allows 20 per business each day.",429);
}
export async function suggestReviewReply(actor:ReviewActor,id:string,sql=db(),generate=generateReviewSuggestions){
 const rows=await sql`SELECT r.id,r.rating,r.comment,r.business_id,b.customer_id,b.business_name FROM workspace_sample_reviews r
 JOIN review_workspaces w ON w.business_id=r.business_id JOIN businesses b ON b.id=w.business_id JOIN customers c ON c.id=b.customer_id
 WHERE r.id=${id} AND w.mode='sample' AND (${actor.kind==="admin"} OR (lower(c.email)=${email(actor)} AND c.account_status='active'))`;
 if(!rows.length)throw new ReviewAiError("Review is unavailable.",404);
 const r=rows[0];
 await reserveGeneration(String(r.business_id),sql);
 return generate(String(r.business_name),Number(r.rating),String(r.comment),undefined,{businessId:String(r.business_id),customerId:String(r.customer_id),service:'sample_manual'});
}
export async function runSampleAutoReplies(actor:ReviewActor,businessId:string,sql=db(),generate=generateReviewSuggestions){
 const rows=await sql`SELECT r.id,r.rating,r.reply,r.comment,r.version,r.business_id,b.customer_id,b.business_name,w.auto_enabled,w.auto_four,w.auto_five,w.auto_style,w.settings_version
 FROM workspace_sample_reviews r JOIN review_workspaces w ON w.business_id=r.business_id JOIN businesses b ON b.id=w.business_id JOIN customers c ON c.id=b.customer_id
 WHERE b.id=${businessId} AND w.mode='sample' AND w.auto_enabled AND r.reply='' AND r.rating IN (4,5)
 AND ((r.rating=4 AND w.auto_four) OR (r.rating=5 AND w.auto_five))
 AND (r.auto_attempt_at IS NULL OR r.auto_attempt_at<now()-interval '15 minutes')
 AND (${actor.kind==="admin"} OR (lower(c.email)=${email(actor)} AND c.account_status='active')) ORDER BY r.sample_key LIMIT 1`;
 let saved=0;
 for(const r of rows){
  const settings:AutoReplySettings={enabled:Boolean(r.auto_enabled),four:Boolean(r.auto_four),five:Boolean(r.auto_five),style:r.auto_style as ReplyStyle,version:Number(r.settings_version)};
  if(!eligibleForAutoReply(Number(r.rating),String(r.reply),settings))continue;
  const claimed=await sql`UPDATE workspace_sample_reviews SET auto_attempt_at=now() WHERE id=${r.id} AND version=${r.version}
   AND reply='' AND (auto_attempt_at IS NULL OR auto_attempt_at<now()-interval '15 minutes') RETURNING id`;
  if(!claimed.length)continue;
  await reserveGeneration(String(r.business_id),sql);
  const suggestions=await generate(String(r.business_name),Number(r.rating),String(r.comment),undefined,{businessId:String(r.business_id),customerId:String(r.customer_id),service:'sample_automatic'});
  // Recheck ownership, enabled settings and version after inference; never replace a customer's edit.
  const updated=await sql`UPDATE workspace_sample_reviews r SET reply=${suggestions[settings.style]},status='draft',reply_source='ai-auto',version=r.version+1,updated_at=now()
   FROM review_workspaces w,businesses b,customers c WHERE r.id=${r.id} AND r.version=${r.version} AND r.reply=''
   AND w.business_id=r.business_id AND b.id=w.business_id AND c.id=b.customer_id AND w.mode='sample' AND w.auto_enabled
   AND w.settings_version=${settings.version} AND ((r.rating=4 AND w.auto_four) OR (r.rating=5 AND w.auto_five))
   AND (${actor.kind==="admin"} OR (lower(c.email)=${email(actor)} AND c.account_status='active')) RETURNING r.id`;
  saved+=updated.length;
 }
 return {saved};
}
export async function runScheduledSampleAutoReplies(){
 const sql=db();
 const rows=await sql`SELECT w.business_id FROM review_workspaces w JOIN businesses b ON b.id=w.business_id JOIN customers c ON c.id=b.customer_id
 WHERE w.mode='sample' AND w.auto_enabled AND c.account_status='active' AND EXISTS(SELECT 1 FROM customer_marketing_access ma WHERE ma.customer_id=c.id AND ma.status IN ('active','testing') AND (ma.expires_at IS NULL OR ma.expires_at>now())) ORDER BY w.ai_last_at NULLS FIRST LIMIT 4`;
 let saved=0;
 for(const row of rows){
  try{saved+=(await runSampleAutoReplies({kind:"admin"},String(row.business_id),sql)).saved;}catch{/* Retry on a later scheduled run; never log review content. */}
 }
 return {saved};
}
