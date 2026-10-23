import {it,expect,vi,afterEach} from 'vitest';
import {mutateScanApproval} from '@/lib/heatmap-approval';
const actor={kind:'customer' as const,email:'owner@example.test'},businessId='location-a';
const link={enabled:true,customer_id:'customer-a',parent:'accounts/a/locations/a',google_subject:'subject-a'};
afterEach(()=>vi.unstubAllEnvs());
it.each([3,5,7])('quotes %s-square grids without queuing a paid scan',async size=>{
 vi.stubEnv('DATAFORSEO_LOGIN','fixture');vi.stubEnv('DATAFORSEO_PASSWORD','fixture');
 const sql=vi.fn().mockResolvedValueOnce([link]).mockResolvedValueOnce([{manual_enabled:true}]).mockResolvedValueOnce([{id:'quote',cost_microusd:size*size*600,settings:{keyword:'boutique',size,spacingKm:1,language:'en'},expires_at:'2026-10-23T18:00:00Z'}]);
 const result=await mutateScanApproval(actor,{action:'quote',businessId,id:'track',version:1},sql as any);
 expect(result.quote?.cost).toBe(size*size*600/1e6);
 const query=sql.mock.calls[2][0].join('');
 expect(query).toContain('local_rank_quotes');expect(query).not.toContain('local_rank_runs');expect(query).not.toContain('local_rank_points');
 expect(sql.mock.calls[2]).toContain(businessId);expect(sql.mock.calls[2]).toContain('customer-a');
});
it('rejects another location quote before queueing',async()=>{
 vi.stubEnv('DATAFORSEO_LOGIN','fixture');vi.stubEnv('DATAFORSEO_PASSWORD','fixture');
 const sql=vi.fn().mockResolvedValueOnce([link]).mockResolvedValueOnce([{manual_enabled:true}]).mockResolvedValueOnce([]);
 await expect(mutateScanApproval(actor,{action:'approve',businessId,quoteId:'other-location-quote'},sql as any)).rejects.toMatchObject({status:404});
 expect(sql).toHaveBeenCalledTimes(3);
});
