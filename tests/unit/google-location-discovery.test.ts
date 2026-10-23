import {describe,it,expect,vi} from 'vitest';
import {discoverGoogleLocations} from '../../src/lib/google-business/location-discovery';
describe('Google location selection discovery',()=>{
 it('collects account and location pages, expands groups, and deduplicates businesses without binding or importing',async()=>{
  const post=vi.fn(async(b:Record<string,string>)=>{
   if(b.action==='accounts'&&b.parent)return {accounts:[{name:'accounts/group',type:'LOCATION_GROUP'}]};
   if(b.action==='accounts')return b.pageToken?{accounts:[{name:'accounts/org',type:'ORGANIZATION'}]}:{accounts:[{name:'accounts/personal',type:'PERSONAL'}],nextPageToken:'accounts2'};
   if(b.account==='accounts/group')return {locations:[{name:'locations/one',title:'One'},{name:'locations/three',title:'Three'}]};
   return b.pageToken?{locations:[{name:'locations/two',title:'Two'}]}:{locations:[{name:'locations/one',title:'One'}],nextPageToken:'locations2'};
  });
  const rows=await discoverGoogleLocations(post);
  expect(rows.map(r=>r.name).sort()).toEqual(['locations/one','locations/three','locations/two']);
  expect(rows.find(r=>r.name==='locations/three')?.account).toBe('accounts/group');
  expect(post.mock.calls.every(([b])=>['accounts','locations'].includes(b.action))).toBe(true);
 });
 it('rejects repeated page tokens instead of looping or presenting an incomplete list',async()=>{
  await expect(discoverGoogleLocations(async()=>({accounts:[],nextPageToken:'repeat'}))).rejects.toThrow('repeated a page');
 });
 it('surfaces an account failure rather than silently omitting its businesses',async()=>{
  await expect(discoverGoogleLocations(async b=>{if(b.action==='accounts')return {accounts:[{name:'accounts/a'}]};throw Error('Access denied');})).rejects.toThrow('Access denied');
 });
});
