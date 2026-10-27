import {describe,it,expect,vi} from 'vitest';
import {localSnapshot} from '@/lib/local-management';
function deferred(){let resolve!:(value:any[])=>void;let reject!:(error:Error)=>void;const promise=new Promise<any[]>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
describe('dashboard independent reads',()=>{
 it('starts all customer reads before any completes and preserves the response shape',async()=>{
  const pending=[deferred(),deferred(),deferred()];let next=0;const sql=vi.fn(()=>pending[next++].promise);
  const snapshot=localSnapshot({kind:'customer',email:' OWNER@EXAMPLE.COM '},sql as any);
  expect(sql).toHaveBeenCalledTimes(3);
  for(const call of sql.mock.calls as any[])expect(call).toContain('owner@example.com');
  const locations=[{id:'own-location'}],listings=[{business_id:'own-location'}],licenses={location_limit:3,used:1};
  pending[2].resolve([licenses]);pending[0].resolve(locations);pending[1].resolve(listings);
  expect(await snapshot).toEqual({locations,listings,licenses,customers:[]});
 });
 it('starts the staff customer list concurrently without requesting customer licenses',async()=>{
  const pending=[deferred(),deferred(),deferred()];let next=0;const sql=vi.fn(()=>pending[next++].promise);
  const snapshot=localSnapshot({kind:'admin'},sql as any);expect(sql).toHaveBeenCalledTimes(3);
  pending[0].resolve([]);pending[1].resolve([]);pending[2].resolve([{id:'customer'}]);
  expect(await snapshot).toEqual({locations:[],listings:[],customers:[{id:'customer'}],licenses:null});
 });
 it('rejects the complete snapshot when any read fails instead of exposing partial results',async()=>{
  const pending=[deferred(),deferred(),deferred()];let next=0;const sql=vi.fn(()=>pending[next++].promise);
  const snapshot=localSnapshot({kind:'customer',email:'owner@example.com'},sql as any);const rejected=expect(snapshot).rejects.toThrow('database unavailable');
  pending[1].reject(new Error('database unavailable'));pending[0].resolve([]);pending[2].resolve([]);await rejected;
 });
});
