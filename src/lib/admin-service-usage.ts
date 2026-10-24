import {liveDb} from './google-business/live-reviews';

const number=(value:unknown)=>Math.max(0,Number(value)||0);
export function usageAccount(row:Record<string,unknown>) {
  return {
    id:String(row.id), name:String(row.account_name||'Unnamed account'),
    reviewCalls:number(row.review_calls),reviewLocations:number(row.review_locations),
    sampleCalls:number(row.sample_calls),sampleLocations:number(row.sample_locations),
    fixCalls:number(row.fix_calls),fixLocations:number(row.fix_locations),
    runs:number(row.runs),points:number(row.points),completed:number(row.completed),queued:number(row.queued),
    scheduledLocations:number(row.scheduled_locations),manualLocations:number(row.manual_locations),
    knownCostMicros:number(row.known_cost),reservedMicros:number(row.reserved),
    unconfirmedCosts:number(row.unconfirmed_costs),
    // Daily counters alone cannot yield costs. The separate AI ledger supplies measured costs.
    aiCostMicros:null,
  };
}
export type UsageAccount=ReturnType<typeof usageAccount>;

export async function serviceUsage(sql=liveDb()) {
  const rows=await sql`WITH bounds AS (
    SELECT date_trunc('month',now() AT TIME ZONE 'America/New_York')::date AS month,
    date_trunc('month',now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York' AS start
  ) SELECT c.id,
    coalesce(nullif(c.name,''),(SELECT b.business_name FROM businesses b WHERE b.customer_id=c.id ORDER BY b.id LIMIT 1),'Unnamed account') AS account_name,
    coalesce(l.calls,0) AS review_calls,coalesce(l.enabled,0) AS review_locations,
    coalesce(w.calls,0) AS sample_calls,coalesce(w.enabled,0) AS sample_locations,
    coalesce(a.calls,0) AS fix_calls,coalesce(a.enabled,0) AS fix_locations,
    coalesce(r.runs,0) AS runs,coalesce(p.points,0) AS points,coalesce(p.completed,0) AS completed,coalesce(p.queued,0) AS queued,
    coalesce(s.enabled,0) AS scheduled_locations,coalesce(s.manual,0) AS manual_locations,
    coalesce(cost.known,0) AS known_cost,coalesce(cost.reserved,0) AS reserved,coalesce(cost.unconfirmed,0) AS unconfirmed_costs
    FROM customers c CROSS JOIN bounds
    LEFT JOIN LATERAL (
      SELECT sum((SELECT count(*) FROM unnest(l.ai_hour_reservations) AS t WHERE t>now()-interval '1 hour')) AS calls,
      count(*) FILTER(WHERE l.enabled AND l.ai_consent AND c.account_status='active') AS enabled
      FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id WHERE b.customer_id=c.id
    ) l ON true
    LEFT JOIN LATERAL (
      SELECT sum(CASE WHEN w.ai_day=current_date THEN w.ai_calls ELSE 0 END) AS calls,
      count(*) FILTER(WHERE w.mode='sample' AND c.account_status='active') AS enabled
      FROM review_workspaces w JOIN businesses b ON b.id=w.business_id WHERE b.customer_id=c.id
    ) w ON true
    LEFT JOIN LATERAL (
      SELECT sum(CASE WHEN a.ai_day=current_date THEN a.ai_calls ELSE 0 END) AS calls,
      count(*) FILTER(WHERE a.preview_enabled AND l.enabled AND a.parent=l.parent AND a.google_subject=l.google_subject AND c.account_status='active') AS enabled
      FROM local_issue_access a JOIN businesses b ON b.id=a.business_id AND b.customer_id=a.customer_id
      LEFT JOIN google_review_links l ON l.business_id=a.business_id AND l.customer_id=a.customer_id WHERE b.customer_id=c.id
    ) a ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS runs FROM local_rank_runs r JOIN businesses b ON b.id=r.business_id AND b.customer_id=r.customer_id WHERE b.customer_id=c.id AND r.created_at>=bounds.start
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS points,count(*) FILTER(WHERE p.state='complete') AS completed,count(*) FILTER(WHERE p.state='queued') AS queued
      FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id JOIN businesses b ON b.id=r.business_id AND b.customer_id=r.customer_id
      WHERE b.customer_id=c.id AND r.created_at>=bounds.start
    ) p ON true
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER(WHERE s.enabled AND c.account_status='active' AND l.enabled AND s.parent=l.parent AND s.google_subject=l.google_subject) AS enabled,
      count(*) FILTER(WHERE s.enabled AND s.manual_enabled AND c.account_status='active' AND l.enabled AND s.parent=l.parent AND s.google_subject=l.google_subject) AS manual
      FROM local_rank_schedules s JOIN businesses b ON b.id=s.business_id AND b.customer_id=s.customer_id
      LEFT JOIN google_review_links l ON l.business_id=s.business_id AND l.customer_id=s.customer_id WHERE b.customer_id=c.id
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT sum(p.actual_microusd) AS known,sum(p.reserved_microusd) AS reserved,
      count(*) FILTER(WHERE p.actual_microusd IS NULL AND p.reserved_microusd>0) AS unconfirmed
      FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id JOIN businesses b ON b.id=r.business_id AND b.customer_id=r.customer_id
      WHERE b.customer_id=c.id AND p.budget_month=bounds.month
    ) cost ON true
    WHERE c.account_status<>'guest' ORDER BY c.created_at DESC`;
  const [budget]=await sql`SELECT cfg.enabled,cfg.halt_reason IS NOT NULL AS halted,cfg.monthly_cap_microusd,
    coalesce(b.reserved_microusd,0) AS reserved,
    to_char(now() AT TIME ZONE 'America/New_York','YYYY-MM') AS month,
    to_char(current_date,'YYYY-MM-DD') AS ai_day
    FROM local_rank_provider cfg LEFT JOIN local_rank_budgets b ON b.month=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date WHERE cfg.id=true`;
  return {accounts:rows.map(usageAccount),budget:budget?{
    enabled:Boolean(budget.enabled),halted:Boolean(budget.halted),capMicros:number(budget.monthly_cap_microusd),reservedMicros:number(budget.reserved),
    remainingMicros:Math.max(0,number(budget.monthly_cap_microusd)-number(budget.reserved)),month:String(budget.month),aiDay:String(budget.ai_day),
  }:null};
}
