import {neon} from '@neondatabase/serverless';
const database=()=>neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
export type AiUsageTotals={calls:number;measured:number;unknown:number;input:number;output:number;costNano:number};
export function aiUsageTotals(row:Record<string,unknown>):AiUsageTotals {
  const n=(key:string)=>Math.max(0,Number(row[key])||0);
  return {calls:n('calls'),measured:n('measured'),unknown:n('unknown'),input:n('input'),output:n('output'),costNano:n('cost')};
}
export async function adminAiUsage(sql=database()) {
  const rows=await sql`WITH location_ids AS (
    SELECT customer_id,id AS business_id FROM businesses
    UNION SELECT customer_id,business_id FROM ai_usage_events
  ) SELECT ids.customer_id,ids.business_id,
    count(e.id)::int AS calls,count(e.id) FILTER(WHERE e.status='measured')::int AS measured,
    count(e.id) FILTER(WHERE e.status<>'measured')::int AS unknown,
    coalesce(sum(e.input_tokens),0) AS input,coalesce(sum(e.output_tokens),0) AS output,coalesce(sum(e.cost_nano_usd),0) AS cost
    FROM location_ids ids LEFT JOIN ai_usage_events e ON e.customer_id=ids.customer_id AND e.business_id=ids.business_id
      AND e.started_at>=date_trunc('month',now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
    GROUP BY ids.customer_id,ids.business_id ORDER BY ids.customer_id,ids.business_id`;
  const [tracking]=await sql`SELECT started_at FROM ai_usage_tracking WHERE id=true`;
  const accounts:Record<string,{totals:AiUsageTotals;locations:{id:string;totals:AiUsageTotals}[]}>=Object.create(null);
  for(const row of rows){
    const id=String(row.customer_id),totals=aiUsageTotals(row);
    const account=accounts[id]??={totals:{calls:0,measured:0,unknown:0,input:0,output:0,costNano:0},locations:[]};
    account.locations.push({id:String(row.business_id),totals});
    for(const key of Object.keys(totals) as (keyof AiUsageTotals)[])account.totals[key]+=totals[key];
  }
  return {accounts,ledgerCreatedAt:tracking?.started_at?String(tracking.started_at):null};
}
