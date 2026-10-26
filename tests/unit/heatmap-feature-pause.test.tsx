import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {heatmapFeatureEnabled} from '@/lib/heatmap-feature';
import {locationTools} from '@/lib/customer-navigation';
import {OverviewLocationInsights} from '@/components/account/overview-location-insights';
import {runHeatmapMaintenance} from '@/lib/heatmap-scans';
import {mutateScanApproval} from '@/lib/heatmap-approval';
afterEach(()=>vi.unstubAllEnvs());
it('hides client navigation and overview heat maps but retains profile optimization',()=>{
 expect(heatmapFeatureEnabled).toBe(false);
 expect(locationTools.some(t=>t.href==='/account/heatmap')).toBe(false);
 const html=renderToStaticMarkup(<OverviewLocationInsights businessId="sample" onProfile={()=>{}} onHeatmap={()=>{}}/>);
 expect(html).toContain('Google profile completeness');expect(html).not.toContain('Heat map &amp; competitors');expect(html).not.toContain('Open heat map');
});
it('does not queue, reserve, or submit scans while paused',async()=>{
 vi.stubEnv('DATAFORSEO_LOGIN','fixture');vi.stubEnv('DATAFORSEO_PASSWORD','fixture');
 const sql=vi.fn().mockResolvedValueOnce([{enabled:true}]).mockResolvedValue([]),provider={submit:vi.fn(),collect:vi.fn()};
 expect(await runHeatmapMaintenance(sql as never,provider)).toMatchObject({status:'paused',submitted:0});
 expect(provider.submit).not.toHaveBeenCalled();
 expect(sql.mock.calls.map(c=>c[0].join('?')).join(' ')).not.toMatch(/INSERT INTO|claim_local_rank_points|reserve_marketing_units|DELETE FROM/);
});
it('still collects an already paid task without submitting another scan',async()=>{
 vi.stubEnv('DATAFORSEO_LOGIN','fixture');vi.stubEnv('DATAFORSEO_PASSWORD','fixture');
 const sql=vi.fn().mockResolvedValueOnce([{enabled:true}]).mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'p',provider_id:'task',anchor:{placeId:'place'}}]).mockResolvedValue([]);
 const provider={submit:vi.fn(),collect:vi.fn().mockResolvedValue({state:'complete',rank:3})};
 expect(await runHeatmapMaintenance(sql as never,provider)).toMatchObject({status:'paused',submitted:0,collected:1});
 expect(provider.collect).toHaveBeenCalledWith('task','place');expect(provider.submit).not.toHaveBeenCalled();
});
it('rejects scan approval before creating a quote or touching saved data',async()=>{
 const sql=vi.fn();await expect(mutateScanApproval({kind:'customer',email:'test@example.com'},{action:'approve',businessId:'location',quoteId:'quote'},sql as never)).rejects.toMatchObject({status:423});expect(sql).not.toHaveBeenCalled();
});
