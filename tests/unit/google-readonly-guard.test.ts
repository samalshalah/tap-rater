import {it,expect,vi} from 'vitest';
import {allowedGoogleQaRequest,norahLocation,norahTitle,type GoogleQaReadScope} from '../fixtures/reviews-launch/google-readonly-guard';
import {discoverQaNorah} from '../fixtures/reviews-launch/google-readonly-discovery';
it('permits account discovery but requires discovered accounts and exact selected-location review scope',()=>{
 const accounts=new Set<string>(),scope:GoogleQaReadScope={accounts};
 const allowed=(url:string,method='GET')=>allowedGoogleQaRequest(new URL(url),method,'qa-api.example',scope);
 const account='accounts/discovered',reviews=`https://mybusiness.googleapis.com/v4/${account}/${norahLocation}/reviews`;
 const locations=`https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations`;
 expect(allowed('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')).toBe(true);
 expect(allowed('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?parentAccount=accounts/unknown')).toBe(false);
 expect(allowed(locations)).toBe(false);expect(allowed(reviews)).toBe(false);
 accounts.add(account);expect(allowed(locations)).toBe(true);expect(allowed(reviews)).toBe(false);
 expect(allowed('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?parentAccount='+account)).toBe(true);
 scope.reviewAccount=account;expect(allowed(reviews)).toBe(true);expect(allowed(reviews+'?pageToken=next')).toBe(true);
 for(const method of ['POST','PUT','PATCH','DELETE']){expect(allowed(reviews,method)).toBe(false);expect(allowed(locations,method)).toBe(false);expect(allowed('https://mybusinessaccountmanagement.googleapis.com/v1/accounts',method)).toBe(false);}
 expect(allowed(reviews+'/123/reply','PUT')).toBe(false);expect(allowed(reviews.replace(norahLocation,'locations/another'))).toBe(false);
 expect(allowed(reviews.replace(account,'accounts/not-returned'))).toBe(false);
 expect(allowed('https://oauth2.googleapis.com/token','POST')).toBe(true);expect(allowed('https://oauth2.googleapis.com/revoke','POST')).toBe(false);
 expect(allowed('https://taprater.com/api/admin/google-business/callback')).toBe(false);expect(allowed('http://qa-api.example/sql','POST')).toBe(false);
});
it('discovers current accounts before locations and matches the fixed location ID and title',async()=>{
 const accounts=new Set<string>();
 const client={listAccounts:vi.fn().mockResolvedValue({accounts:[{name:'accounts/current'}]}),listLocations:vi.fn().mockImplementation(async(account:string)=>{
  expect(accounts.has(account)).toBe(true);
  return {locations:[{name:'locations/unrelated',title:norahTitle},{name:norahLocation,title:norahTitle}]};
 })};
 expect(await discoverQaNorah(client,accounts)).toEqual({account:'accounts/current',location:{name:norahLocation,title:norahTitle}});
 expect(client.listAccounts).toHaveBeenCalledOnce();expect(client.listLocations).toHaveBeenCalledWith('accounts/current',undefined);
});
it('supports returned account groups and skips stale accounts without expanding to unreturned IDs',async()=>{
 const accounts=new Set<string>();
 const client={listAccounts:vi.fn().mockResolvedValueOnce({accounts:[{name:'accounts/stale'},{name:'accounts/group',type:'ORGANIZATION'}]}).mockResolvedValueOnce({accounts:[{name:'accounts/current'}]}),listLocations:vi.fn().mockRejectedValueOnce({status:404}).mockResolvedValueOnce({locations:[{name:norahLocation,title:norahTitle}]})};
 expect((await discoverQaNorah(client,accounts)).account).toBe('accounts/current');
 expect(client.listAccounts).toHaveBeenNthCalledWith(2,undefined,'accounts/group');
 expect(client.listLocations.mock.calls.map(call=>call[0])).toEqual(['accounts/stale','accounts/current']);
});
it('rejects a mismatched title even when the location ID matches',async()=>{
 const client={listAccounts:vi.fn().mockResolvedValue({accounts:[{name:'accounts/current'}]}),listLocations:vi.fn().mockResolvedValue({locations:[{name:norahLocation,title:'Another business'}]})};
 await expect(discoverQaNorah(client,new Set())).rejects.toThrow('identity mismatch');
});
it('rejects unsafe account resource names before location discovery',async()=>{
 const client={listAccounts:vi.fn().mockResolvedValue({accounts:[{name:'accounts/../other'}]}),listLocations:vi.fn()};
 await expect(discoverQaNorah(client,new Set())).rejects.toThrow('Invalid Google discovery account');expect(client.listLocations).not.toHaveBeenCalled();
});
it('stops repeated pagination rather than reading indefinitely',async()=>{
 const client={listAccounts:vi.fn().mockResolvedValue({accounts:[],nextPageToken:'same'}),listLocations:vi.fn()};
 await expect(discoverQaNorah(client,new Set())).rejects.toThrow('repeated');expect(client.listAccounts).toHaveBeenCalledTimes(2);expect(client.listLocations).not.toHaveBeenCalled();
});
