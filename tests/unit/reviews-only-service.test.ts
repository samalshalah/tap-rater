import {describe,it,expect,vi} from 'vitest';
import {businessOptimizationEnabled} from '@/lib/business-optimization-feature';
import {locationTools} from '@/lib/customer-navigation';
import {prepareProfileAgentDraft,saveProfileAgentSettings} from '@/lib/profile-ai-agent';
import {handleLocalIssues} from '@/lib/local-issue-http';
import {handleProfile} from '@/lib/google-business/profile-http';
import {accountBusinesses} from '@/lib/account-business-drafts';

describe('Google Reviews only service',()=>{
 it('keeps reviews navigation without optimization destinations',()=>{
  expect(businessOptimizationEnabled).toBe(false);
  expect(locationTools.map(x=>x.href)).toEqual(['/account','/account/reviews']);
 });
 it('blocks profile and issue endpoints before any work or mutation',async()=>{
  for(const handler of [handleProfile,handleLocalIssues])for(const method of ['GET','POST']){
   const response=await handler(new Request('https://taprater.com/api/account/local/google',{method}),'customer');
   expect(response.status).toBe(410);
   expect(await response.json()).toMatchObject({code:'OPTIMIZATION_PAUSED'});
  }
 });
 it('does not run queued profile AI or allow enabling it',async()=>{
  const sql=vi.fn(),sync=vi.fn(),generate=vi.fn();
  expect(await prepareProfileAgentDraft('existing-location',sql as never,sync,generate)).toEqual({drafted:false});
  await expect(saveProfileAgentSettings({kind:'customer',email:'owner@example.test'},{},sql as never)).rejects.toMatchObject({status:410});
  expect(sql).not.toHaveBeenCalled();expect(sync).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();
 });
 it('identifies retained business records removed from the reviews service',async()=>{
  const sql=vi.fn().mockResolvedValue([{id:'retained',status:'marketing_removed',business_name:'Retained stand business'},{id:'current',status:'active',business_name:'Active review business'}]);
  const records=await accountBusinesses('owner@example.test',null,sql as never);
  expect(records.map(b=>[b.id,b.marketingRemoved])).toEqual([['retained',true],['current',false]]);
 });
});
