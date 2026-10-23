import {describe,it,expect,vi} from 'vitest';
import {compareCompetitors} from '@/lib/heatmap-competitors';
import {parseRankResult,createRankProvider} from '@/lib/dataforseo';
import {recoverHeatmapCompetitors} from '@/lib/heatmap-competitor-recovery';
const target={placeId:'norah',title:'Norah Boutique'};
const competitor=(placeId:string,rank:number)=>({placeId,title:placeId,rank,address:null,rating:null,reviews:null});
describe('competitor comparison',()=>{
 it('separates keywords and distinguishes missing capture from absence',()=>{
  const result=compareCompetitors([
   {trackId:'a',index:0,state:'complete',competitors:[competitor('norah',2),competitor('other',1)]},
   {trackId:'a',index:1,state:'complete',competitors:[]},
   {trackId:'a',index:2,state:'complete',competitors:null},
   {trackId:'b',index:0,state:'complete',competitors:[competitor('wrong-keyword',1)]},
   {trackId:'a',index:3,state:'pending',competitors:[competitor('pending',1)]},
  ],'a',target,3);
  expect(result.captured).toBe(2);expect(result.rows.map(r=>r.placeId)).toEqual(['norah','other']);
  expect(result.rows[0]).toMatchObject({average:2,top3:50,found:1});
  expect(result.rows[0].ranks.slice(0,3)).toEqual([2,null,undefined]);
 });
 it('deduplicates each point and keeps same-name businesses separate by place ID',()=>{
  const p={trackId:'a',index:0,state:'complete',competitors:[competitor('one',1),competitor('one',2),competitor('two',3)]};
  const result=compareCompetitors([p,p],'a',target,3);expect(result.captured).toBe(1);expect(result.rows).toHaveLength(3);expect(result.rows.find(r=>r.placeId==='one')?.average).toBe(1);
 });
 it('retains only top20 organic results and truthful rating metadata',()=>{
  const raw={status_code:20000,tasks:[{id:'task',status_code:20000,result:[{items:[
   {type:'maps_paid_item',place_id:'ad',rank_group:1},
   {type:'maps_search',place_id:'norah',rank_group:2,title:'Norah',rating:{rating_type:'Max5',value:4.8,votes_count:22}},
   {type:'maps_search',place_id:'norah',rank_group:3},
   {type:'maps_search',place_id:'beyond',rank_group:21},
   {type:'maps_search',place_id:'unknown-rating',rank_group:5,rating:{rating_type:'Percents',value:98}},
  ]}]}]};
  const result=parseRankResult(raw,'task','norah');expect(result.competitors).toHaveLength(2);expect(result.competitors?.[0]).toMatchObject({placeId:'norah',rank:2,rating:4.8,reviews:22});expect(result.competitors?.[1].rating).toBeNull();
 });
 it('cannot retrieve a run from a different location or assignment',async()=>{
  const sql=vi.fn().mockResolvedValue([]),provider={submit:vi.fn(),collect:vi.fn()};
  await expect(recoverHeatmapCompetitors({businessId:'location',runId:'run',trackId:'track'},{customer_id:'customer',parent:'parent',google_subject:'subject'},sql as any,provider)).rejects.toThrow('unavailable');
  expect(provider.collect).not.toHaveBeenCalled();expect(provider.submit).not.toHaveBeenCalled();
  expect(sql.mock.calls[0].slice(1)).toEqual(['run','location','customer','parent','subject','track']);
 });
 it('retrieves existing tasks without submission or rank changes',async()=>{
  const sql=vi.fn().mockResolvedValueOnce([{id:'run',anchor:{placeId:'norah'}}]).mockResolvedValueOnce([{id:'point',provider_id:'task'}]).mockResolvedValueOnce([{id:'point'}]);
  const provider={submit:vi.fn(),collect:vi.fn().mockResolvedValue({state:'complete',competitors:[]})};
  expect(await recoverHeatmapCompetitors({businessId:'location',runId:'run',trackId:'track'},{customer_id:'customer',parent:'parent',google_subject:'subject'},sql as any,provider)).toMatchObject({recovered:1,providerCost:0,published:false});
  expect(provider.collect).toHaveBeenCalledWith('task','norah');expect(provider.submit).not.toHaveBeenCalled();
  const query=sql.mock.calls[2][0].join('');expect(query).toContain('SET competitors=');expect(query).not.toContain('rank=');expect(query).toContain('l.enabled');
 });
 it('free collection only performs GET',async()=>{
  vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
  try{const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({status_code:20000,tasks:[{id:'task',status_code:40102}]})));await createRankProvider(fetcher).collect('task','norah');expect(fetcher.mock.calls[0][1].method).toBe('GET');}finally{vi.unstubAllEnvs();}
 });
 it('preserves the runtime receiver required by Workers fetch',async()=>{
  vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
  try{const fetcher=function(this:unknown){if(this!==globalThis)throw new TypeError('Illegal invocation');return Promise.resolve(new Response(JSON.stringify({status_code:20000,tasks:[{id:'task',status_code:40102}]})));};expect((await createRankProvider(fetcher as typeof fetch).collect('task','norah')).state).toBe('complete');}finally{vi.unstubAllEnvs();}
 });
 it('uses an edge-supported redirect mode and refuses redirects without retry',async()=>{
  vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
  try{const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:302,headers:{Location:'https://untrusted.example'}}));await expect(createRankProvider(fetcher).collect('task','norah')).rejects.toThrow('request failed');expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][1].redirect).toBe('manual');}finally{vi.unstubAllEnvs();}
 });
});
