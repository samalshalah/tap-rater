import {describe,it,expect,vi,afterEach} from 'vitest';
import {rankRequest,scanPeriod,parseRankResult,createRankProvider} from '@/lib/dataforseo';
import {runHeatmapMaintenance} from '@/lib/heatmap-scans';
const settings={keyword:'boutique near me',size:5 as const,spacingKm:0.5 as const,language:'en' as const};
const point={index:0,row:0,column:0,latitude:38.9,longitude:-77};
afterEach(()=>vi.unstubAllEnvs());
describe('DataForSEO paid-request safety and ranking accuracy',()=>{
 it('uses four calendar periods even in five-week months and respects New York midnight',()=>{
  expect(scanPeriod(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-22');
  expect(scanPeriod(new Date('2026-11-01T06:00:00Z'))).toBe('2026-11-01');
  const periods=new Set(Array.from({length:31},(_,i)=>scanPeriod(new Date(`2026-10-${String(i+1).padStart(2,'0')}T12:00:00Z`))));expect(periods.size).toBe(4);
 });
 it('fixes paid parameters and rejects operators including encoded syntax',()=>{
  expect(rankRequest(settings,point)).toMatchObject({priority:1,depth:20,device:'desktop',search_this_area:false,search_places:false,location_coordinate:'38.9,-77,15z'});
  for(const keyword of ['site:example.com','site%3Aexample.com','foo+bar'])expect(()=>rankRequest({...settings,keyword},point)).toThrow();
 });
 it('matches exact Place ID and excludes paid positions and same-name competitors',()=>{
  const raw={status_code:20000,tasks:[{id:'task',status_code:20000,result:[{items:[{type:'maps_paid_item',place_id:'target',rank_group:1},{type:'maps_search',place_id:'other',rank_group:1},{type:'maps_search',place_id:'target',rank_group:7}]}]}]};
  expect(parseRankResult(raw,'task','target')).toMatchObject({state:'complete',rank:7,count:2});
  expect(parseRankResult(raw,'task','absent')).toMatchObject({state:'complete',rank:null,count:2});
  expect(parseRankResult(raw,'different','target').state).toBe('error');
 });
 it('does not label pending or malformed responses as unranked',()=>{
  expect(parseRankResult({status_code:20000,tasks:[{id:'task',status_code:40602}]},'task','target')).toEqual({state:'pending'});
  expect(parseRankResult({status_code:20000,tasks:[{id:'task',status_code:20000,result:null}]},'task','target').state).toBe('error');
  expect(parseRankResult({status_code:20000,tasks:[{id:'task',status_code:40102}]},'task','target')).toEqual({state:'complete',rank:null,count:0,competitors:[]});
 });
 it('never retries paid requests after a lost HTTP response',async()=>{
  vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');const fetcher=vi.fn().mockRejectedValue(new Error('network'));
  await expect(createRankProvider(fetcher).submit([{id:'point',request:rankRequest(settings,point)}])).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('correlates task responses by tag rather than array order',async()=>{
  vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({status_code:20000,tasks:[{id:'b',status_code:20100,cost:0.0006,data:{tag:'second'}},{id:'a',status_code:20100,cost:0.0006,data:{tag:'first'}}]})));
  const result=await createRankProvider(fetcher).submit([{id:'first',request:{}},{id:'second',request:{}}]);expect(result.map(r=>r.providerId)).toEqual(['a','b']);expect(result[0].cost).toBe(600);
 });
 it('does no database or paid work until credentials are configured',async()=>{
  vi.stubEnv('DATAFORSEO_LOGIN','');const sql=vi.fn(),provider={submit:vi.fn(),collect:vi.fn()};
  expect((await runHeatmapMaintenance(sql as any,provider)).status).toBe('credentials_required');expect(sql).not.toHaveBeenCalled();expect(provider.submit).not.toHaveBeenCalled();
 });
});

it('preserves a provider rejection code and never retries its paid submission',async()=>{
 vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({status_code:20000,tasks:[{id:'rejected',status_code:40501,cost:0,data:{tag:'point'}}]})));
 const results=await createRankProvider(fetcher).submit([{id:'point',request:{}}]);
 expect(results[0]).toMatchObject({state:'uncertain',providerId:'rejected',code:'provider_40501',cost:0});
 expect(fetcher).toHaveBeenCalledTimes(1);
});
