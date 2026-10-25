import {describe,it,expect,vi,beforeEach} from 'vitest';
const {authorize,resolve}=vi.hoisted(()=>({authorize:vi.fn(),resolve:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({authorizedLink:authorize,liveDb:vi.fn(),clientFor:vi.fn(),LiveReviewError:class extends Error{}}));
vi.mock('@/lib/heatmap-anchor',()=>({resolveHeatmapAnchor:resolve}));
import {mutateHeatmap} from '@/lib/heatmap-management';
const actor={kind:'customer' as const,email:'client@example.test'},input={action:'initialize',businessId:'f363f6f5-0a2c-406c-ba7c-f1f6ead726d7'};
beforeEach(()=>{vi.clearAllMocks();authorize.mockResolvedValue({enabled:true,customer_id:'customer',parent:'accounts/a/locations/b',google_subject:'subject',owner:'owner'});});
describe('coordinate initialization boundaries',()=>{
 it('reuses a saved pin without external requests or insertions',async()=>{
  const sql=vi.fn().mockResolvedValue([{business_id:input.businessId}]),client=vi.fn();
  expect(await mutateHeatmap(actor,input,sql as any,client)).toEqual({initialized:true});expect(sql).toHaveBeenCalledTimes(1);expect(client).not.toHaveBeenCalled();expect(resolve).not.toHaveBeenCalled();
 });
 it('persists a resolved pin once without scan or schedule writes',async()=>{
  const sql=vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{business_id:input.businessId}]);
  const pin={title:'Verified',placeId:'verified',latitude:38,longitude:-77,centerSource:'google_places'};
  resolve.mockResolvedValue(pin);
  const client=vi.fn().mockResolvedValue({getMapAnchor:vi.fn().mockResolvedValue({title:'Verified',placeId:'verified'})});
  await mutateHeatmap(actor,input,sql as any,client);
  expect(sql).toHaveBeenCalledTimes(2);const query=sql.mock.calls[1][0].join(' ');expect(query).toContain('INSERT INTO local_heatmap_locations');expect(query).toContain('ON CONFLICT');expect(query).not.toMatch(/local_rank|marketing_usage/);expect(sql.mock.calls[1]).toContain(JSON.stringify(pin));
 });
 it('does not save unresolved locations or bypass authorization',async()=>{
  const sql=vi.fn().mockResolvedValue([]),client=vi.fn().mockResolvedValue({getMapAnchor:vi.fn().mockResolvedValue({title:'Verified'})});resolve.mockResolvedValue(null);
  await expect(mutateHeatmap(actor,input,sql as any,client)).rejects.toThrow('Get setup help');expect(sql).toHaveBeenCalledTimes(1);
  authorize.mockRejectedValue(new Error('Denied'));sql.mockClear();client.mockClear();await expect(mutateHeatmap(actor,input,sql as any,client)).rejects.toThrow('Denied');expect(sql).not.toHaveBeenCalled();expect(client).not.toHaveBeenCalled();
 });
});
