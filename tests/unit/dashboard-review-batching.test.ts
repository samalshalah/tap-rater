import { describe, expect, it, vi } from 'vitest';
import { listLiveWorkspaces } from '@/lib/google-business/live-reviews';
const a='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const b='9fb3ee3b-0920-4db5-a03d-7245987a8752';
const actor={kind:'customer' as const,email:' OWNER@EXAMPLE.COM '};
describe('dashboard review batching',()=>{
 it('uses two reads for multiple locations and preserves per-location limits, empty locations, and monthly allowance messages',async()=>{
  const sql=vi.fn().mockResolvedValueOnce([{business_id:a,draft_error:'waiting',ai_monthly_limit:10,ai_monthly_used:10},{business_id:b}]).mockResolvedValueOnce(Array.from({length:101},(_,i)=>({business_id:a,id:String(i),draft:'draft '+i,version:2})));
  const result=await listLiveWorkspaces(actor,sql as any);
  expect(sql).toHaveBeenCalledTimes(2);expect(result[0].reviews).toHaveLength(100);expect(result[0].reviews[99].id).toBe('99');expect(result[0].moreReviews).toBe(true);expect(result[0].draft_error).toContain('Monthly AI allowance');expect(result[1].reviews).toEqual([]);expect(result[1].moreReviews).toBe(false);
  expect(result[0].reviews[0]).not.toHaveProperty('business_id');
  const first=sql.mock.calls[0];expect(first).toContain('owner@example.com');expect(first[0].join('?')).toContain("c.account_status='active'");expect(first[0].join('?')).toContain('marketing_location_allowed(b.id)');
  const batch=sql.mock.calls[1];expect(batch[1]).toEqual([a,b]);expect(batch[0].join('?')).toContain('CROSS JOIN LATERAL');expect(batch[0].join('?')).toContain('LIMIT 101');expect(batch[0].join('?')).toContain("interval '30 days'");
 });
 it('does not read reviews when no locations are authorized',async()=>{const sql=vi.fn().mockResolvedValue([]);expect(await listLiveWorkspaces(actor,sql as any)).toEqual([]);expect(sql).toHaveBeenCalledTimes(1);});
 it('applies selected locations in addition to ownership, including an empty selection',async()=>{for(const ids of [[a],[]]){const sql=vi.fn().mockResolvedValue([]);await listLiveWorkspaces(actor,sql as any,ids);expect(sql.mock.calls[0]).toContainEqual(ids);expect(sql.mock.calls[0][0].join('?')).toContain('l.business_id=ANY(');expect(sql.mock.calls[0]).toContain(false);}});
});
