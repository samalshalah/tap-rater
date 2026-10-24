import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {getCloudflareContext} from '@opennextjs/cloudflare';

export type AiUsageContext={businessId:string;customerId:string;service:'review_manual'|'review_automatic'|'sample_manual'|'sample_automatic'|'profile_fix'};
// Snapshot rates with every event. Gross model cost, not an invoice allocation.
// Verified 2026-10-22: https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
export const aiRate={model:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',version:'cloudflare-2026-10-22',input:293,output:2253} as const;
const database=()=>neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
export function providerFailureCategory(error:unknown){
 const message=error instanceof Error?error.message:'';
 if(/json|grammar|structured output/i.test(message))return 'structured_output';
 if(/token|context|too long|too large/i.test(message))return 'input_limit';
 if(/rate|quota|429|capacity/i.test(message))return 'capacity';
 if(/timeout|timed out/i.test(message))return 'timeout';
 if(/auth|permission|403|401/i.test(message))return 'authorization';
 return 'unclassified';
}
export function measuredAiUsage(result:unknown) {
  const usage=(result as {usage?:{prompt_tokens?:unknown;completion_tokens?:unknown}}|null)?.usage;
  const input=usage?.prompt_tokens,output=usage?.completion_tokens;
  if(typeof input!=='number'||typeof output!=='number'||!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input<0||output<0)return null;
  const cost=input*aiRate.input+output*aiRate.output;
  if(!Number.isSafeInteger(cost))return null;
  return {input,output,cost};
}

export async function meterAiCall(context:AiUsageContext,model:string,input:unknown,invoke:(model:string,input:unknown)=>Promise<unknown>,sql=database()) {
  if(model!==aiRate.model)throw new Error('AI model metering is not configured.');
  const id=randomUUID();
  // Fail before inference if durable tracking or ownership is unavailable.
  const rows=await sql`INSERT INTO ai_usage_events(id,customer_id,business_id,service,model,rate_version,input_nano_usd_per_token,output_nano_usd_per_token)
    SELECT ${id}::uuid,b.customer_id,b.id,${context.service},${model},${aiRate.version},${aiRate.input},${aiRate.output}
    FROM businesses b JOIN customers c ON c.id=b.customer_id WHERE b.id=${context.businessId}::uuid AND b.customer_id=${context.customerId}::uuid AND c.account_status='active' RETURNING id`;
  if(!rows.length)throw new Error('AI usage account is unavailable.');
  let result:unknown;
  try {result=await invoke(model,input);}catch(error) {
    console.warn('AI provider failure', {eventId:id,service:context.service,category:providerFailureCategory(error)});
    // A timeout may still have incurred cost. Never log the exception or invent a zero charge.
    try {await sql`UPDATE ai_usage_events SET status='provider_error',finished_at=now() WHERE id=${id}::uuid AND status='started'`;}catch{/* The durable started row remains visibly unresolved. */}
    throw new Error('AI provider request was not confirmed.');
  }
  const usage=measuredAiUsage(result);
  // A retry only repeats the idempotent ledger update, never the provider request.
  const finish=()=>sql`UPDATE ai_usage_events SET status=${usage?'measured':'usage_missing'},input_tokens=${usage?.input??null},output_tokens=${usage?.output??null},cost_nano_usd=${usage?.cost??null},finished_at=now()
    WHERE id=${id}::uuid AND status='started' RETURNING id`;
  try {await finish();}catch {try {await finish();}catch {throw new Error('AI usage recording is unresolved.');}}
  return result;
}

export async function invokeMeteredAi(context:AiUsageContext|undefined,model:string,input:unknown) {
  if(!context)throw new Error('AI usage attribution is required.');
  const {env}=await getCloudflareContext({async:true});
  const ai=(env as unknown as {REVIEW_AI?:{run:(model:string,input:unknown)=>Promise<unknown>}}).REVIEW_AI;
  if(!ai)throw new Error('AI service is not configured.');
  return meterAiCall(context,model,input,(m,i)=>ai.run(m,i));
}
