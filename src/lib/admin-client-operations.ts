import {liveDb} from './google-business/live-reviews';

export type ClientOperation = {
  accountId:string; accountName:string; status:string; locations:number;
  connected:number; syncAttention:number; aiLocations:number; aiCallsToday:number;
  scansThisMonth:number; scanPointsThisMonth:number;
};

// Explicit allowlist: never serialize a business profile, review, draft, keyword,
// Google identity, error message, or ranking/performance result to staff.
export function operationSummary(row:Record<string,unknown>):ClientOperation {
  const count=(key:string)=>Math.max(0,Number(row[key])||0);
  return {
    accountId:String(row.id), accountName:String(row.account_name || 'Unnamed account'),
    status:String(row.account_status), locations:count('locations'),
    connected:count('connected'), syncAttention:count('sync_attention'),
    aiLocations:count('ai_locations'), aiCallsToday:count('ai_calls_today'),
    scansThisMonth:count('scans_this_month'), scanPointsThisMonth:count('scan_points_this_month'),
  };
}

export async function clientOperations(sql=liveDb()):Promise<ClientOperation[]> {
  const rows=await sql`SELECT c.id,c.account_status,
    coalesce(nullif(c.name,''),(SELECT b.business_name FROM businesses b WHERE b.customer_id=c.id ORDER BY b.id LIMIT 1),'Unnamed account') AS account_name,
    (SELECT count(*) FROM businesses b WHERE b.customer_id=c.id) AS locations,
    (SELECT count(*) FROM google_review_links l JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id WHERE b.customer_id=c.id AND l.enabled) AS connected,
    (SELECT count(*) FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id WHERE b.customer_id=c.id AND l.enabled AND nullif(l.last_error,'') IS NOT NULL) AS sync_attention,
    (SELECT count(*) FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id WHERE b.customer_id=c.id AND l.enabled AND l.ai_consent) AS ai_locations,
    (SELECT coalesce(sum(CASE WHEN l.ai_day=current_date THEN l.ai_calls ELSE 0 END),0) FROM google_review_links l JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id WHERE b.customer_id=c.id)
      +(SELECT coalesce(sum(CASE WHEN a.ai_day=current_date THEN a.ai_calls ELSE 0 END),0) FROM local_issue_access a JOIN businesses b ON b.id=a.business_id AND b.customer_id=a.customer_id WHERE b.customer_id=c.id) AS ai_calls_today,
    (SELECT count(*) FROM local_rank_runs r JOIN businesses b ON b.id=r.business_id AND b.customer_id=r.customer_id WHERE b.customer_id=c.id AND r.created_at>=date_trunc('month',now())) AS scans_this_month,
    (SELECT count(*) FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id JOIN businesses b ON b.id=r.business_id AND b.customer_id=r.customer_id WHERE b.customer_id=c.id AND r.created_at>=date_trunc('month',now())) AS scan_points_this_month
    FROM customers c WHERE c.account_status<>'guest' ORDER BY c.created_at DESC`;
  return rows.map(operationSummary);
}
