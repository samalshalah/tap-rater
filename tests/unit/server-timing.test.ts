import {expect,it,vi} from 'vitest';
import {withServerTiming,measureServerStage,requestRead} from '@/lib/server-timing';
const req=(suffix='?timing=1')=>new Request('https://example.test/api/account/session'+suffix);
it('returns unmodified normal responses and suppresses timings for anonymous and failed responses',async()=>{
 for(const [request,body,status] of [[req(''),{authenticated:true},200],[req(),{authenticated:false},200],[req(),{error:'Denied'},403]] as const){
 const r=await withServerTiming(request,()=>measureServerStage('authentication',async()=>Response.json(body,{status})));
 expect(await r.json()).toEqual(body);expect(r.headers.get('Server-Timing')).toBeNull();
 }
});
it('exposes only fixed stage labels and durations while preserving existing response fields',async()=>{
 const r=await withServerTiming(req(),async()=>{
 await measureServerStage('unsafe@email.test',async()=>null);await measureServerStage('authentication',async()=>null);
 return Response.json({authenticated:true,name:'existing'}, {headers:{'X-Existing':'retained'}});
 });
 const d=await r.json();expect(d).toMatchObject({authenticated:true,name:'existing'});expect(d.serverTiming.map((x:any)=>x.name)).toEqual(['authentication','total']);
 expect(r.headers.get('Cache-Control')).toBe('private, no-store');expect(r.headers.get('X-Existing')).toBe('retained');expect(r.headers.get('Server-Timing')).not.toContain('@');
});
it('isolates concurrent request reads, reuses only in-flight request work, and revalidates next request',async()=>{
 const a=vi.fn(async()=>({email:'a'})),b=vi.fn(async()=>({email:'b'}));
 const run=(loader:typeof a)=>withServerTiming(req(''),async()=>{const [one,two]=await Promise.all([requestRead('auth',loader),requestRead('auth',loader)]);expect(one).toBe(two);return Response.json(one);});
 const [ar,br]=await Promise.all([run(a),run(b)]);expect(await ar.json()).toEqual({email:'a'});expect(await br.json()).toEqual({email:'b'});expect(a).toHaveBeenCalledTimes(1);expect(b).toHaveBeenCalledTimes(1);
 await run(a);expect(a).toHaveBeenCalledTimes(2);
});
it('does not memoize outside a GET scope or swallow loader failures',async()=>{
 const load=vi.fn(async()=>1);await requestRead('auth',load);await requestRead('auth',load);expect(load).toHaveBeenCalledTimes(2);
 await withServerTiming(new Request('https://example.test',{method:'POST'}),async()=>{await requestRead('auth',load);await requestRead('auth',load);return Response.json({});});expect(load).toHaveBeenCalledTimes(4);
 await expect(withServerTiming(req(),()=>measureServerStage('authentication',async()=>{throw Error('failure');}))).rejects.toThrow('failure');
});
