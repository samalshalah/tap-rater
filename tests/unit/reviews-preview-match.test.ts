import {describe,it,expect,vi} from 'vitest';
import {findPreviewMatches} from '@/lib/reviews-preview-match';
const loc=(name:string,placeId='target')=>({name,title:'Same name',metadata:{placeId}});
describe('preview business discovery',()=>{
 it('searches paginated accounts, nested groups and locations, deduplicating the same resource',async()=>{
  const listAccounts=vi.fn(async(token?:string,parent?:string)=>parent==='accounts/org'?{accounts:[{name:'accounts/group',type:'LOCATION_GROUP'}]}:token?{accounts:[{name:'accounts/org',type:'ORGANIZATION'}]}:{accounts:[{name:'accounts/personal',type:'PERSONAL'}],nextPageToken:'next'});
  const listLocations=vi.fn(async(account:string,token?:string)=>account==='accounts/group'?{locations:[loc('locations/right')]}:token?{locations:[loc('locations/right')]}:{locations:[loc('locations/wrong','other')],nextPageToken:'more'});
  expect(await findPreviewMatches({listAccounts,listLocations},'target')).toEqual([{account:'accounts/personal',location:'locations/right',title:'Same name',address:''}]);
  expect(listLocations).toHaveBeenCalledWith('accounts/personal','more',true);
  expect(listAccounts).toHaveBeenCalledWith(undefined,'accounts/org');
 });
 it('returns no match for a similar name or missing Place ID',async()=>{
  expect(await findPreviewMatches({listAccounts:async()=>({accounts:[{name:'accounts/a'}]}),listLocations:async()=>({locations:[loc('locations/a','different'),{name:'locations/b',title:'Same name'}]})},'target')).toEqual([]);
 });
 it('requires a choice for distinct exact matches',async()=>{
  expect(await findPreviewMatches({listAccounts:async()=>({accounts:[{name:'accounts/a'}]}),listLocations:async()=>({locations:[loc('locations/a'),loc('locations/b')]})},'target')).toHaveLength(2);
 });
 it('never returns a unique match from an incomplete search',async()=>{
  await expect(findPreviewMatches({listAccounts:async()=>({accounts:[{name:'accounts/a'},{name:'accounts/b'}]}),listLocations:async(a)=>{if(a==='accounts/b')throw Error('Unavailable');return {locations:[loc('locations/a')]};}},'target')).rejects.toThrow('Unavailable');
 });
 it('rejects repeated pagination instead of guessing',async()=>{
  await expect(findPreviewMatches({listAccounts:async()=>({accounts:[],nextPageToken:'loop'}),listLocations:vi.fn()},'target')).rejects.toThrow('repeated');
 });
});
