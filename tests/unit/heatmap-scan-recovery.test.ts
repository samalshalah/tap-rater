import {it,expect,vi} from 'vitest';
import {recoverHeatmapScan} from '@/lib/heatmap-scan-recovery';
it('recovers the original provider task with GET collection and never submits or releases its reservation',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([{id:'point',provider_id:'original-task',anchor:{placeId:'place'}}]).mockResolvedValueOnce([{id:'point'}]);
 const provider={collect:vi.fn().mockResolvedValue({state:'complete',rank:3,count:20,competitors:[]}),submit:vi.fn()};
 expect(await recoverHeatmapScan('business',{customer_id:'owner',parent:'parent',google_subject:'subject'},sql as any,provider)).toMatchObject({recovered:1,providerCost:0,codes:[]});
 expect(provider.collect).toHaveBeenCalledWith('original-task','place');
 expect(provider.submit).not.toHaveBeenCalled();
 const queries=sql.mock.calls.map(c=>c[0].join('?')).join(' ');
 expect(queries).not.toMatch(/INSERT|DELETE|reserved_microusd|state='queued'/);
 expect(sql.mock.calls[0]).toContain('owner');
 expect(sql.mock.calls[1]).toContain('owner');
});
it('retains provider errors without treating them as an unranked business or creating another scan',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([{id:'point',provider_id:'original-task',anchor:{placeId:'place'}}]).mockResolvedValueOnce([{id:'point'}]);
 const provider={collect:vi.fn().mockResolvedValue({state:'error',code:'provider_40202'}),submit:vi.fn()};
 expect(await recoverHeatmapScan('business',{customer_id:'owner',parent:'parent',google_subject:'subject'},sql as any,provider)).toMatchObject({recovered:0,codes:['provider_40202']});
 expect(provider.submit).not.toHaveBeenCalled();
});
