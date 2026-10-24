import {describe,it,expect,vi} from 'vitest';
import {prepareProfileAgentDraft,saveProfileAgentSettings} from '@/lib/profile-ai-agent';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const link={customer_id:id,parent:'accounts/a/locations/l',google_subject:'subject',enabled:true,profile_ai_enabled:true,settings_version:3};
const rows=(...values:unknown[])=>{const q=vi.fn();values.forEach(v=>q.mockResolvedValueOnce(v));return q as any;};
describe('profile agent',()=>{
 it('does no work when off',async()=>{const sync=vi.fn(),prepare=vi.fn();expect(await prepareProfileAgentDraft(id,rows([{...link,profile_ai_enabled:false}]),sync,prepare)).toEqual({drafted:false});expect(sync).not.toHaveBeenCalled();expect(prepare).not.toHaveBeenCalled();});
 it('prepares only the selected location issue as a draft using the checked settings version',async()=>{const sync=vi.fn(),prepare=vi.fn();expect(await prepareProfileAgentDraft(id,rows([link],[{id,fingerprint:'f'}]),sync,prepare)).toEqual({drafted:true,published:false});expect(prepare).toHaveBeenCalledWith({kind:'admin'},{action:'preview',businessId:id,id,fingerprint:'f'},expect.anything(),undefined,3);});
 it('rejects a stale toggle',async()=>{await expect(saveProfileAgentSettings({kind:'customer',email:'c@example.com'},{businessId:id,enabled:true,version:2},rows([link],[]))).rejects.toMatchObject({status:409});});
 it('requires ownership before changing settings',async()=>{const sql=rows([]);await expect(saveProfileAgentSettings({kind:'customer',email:'other@example.com'},{businessId:id,enabled:true,version:3},sql)).rejects.toMatchObject({status:404});expect(sql).toHaveBeenCalledTimes(1);});
});

it('does not prepare when disconnected or when there is no eligible issue',async()=>{
 const sync=vi.fn(),prepare=vi.fn();
 expect(await prepareProfileAgentDraft(id,rows([{...link,enabled:false}]),sync,prepare)).toEqual({drafted:false});
 expect(sync).not.toHaveBeenCalled();
 expect(await prepareProfileAgentDraft(id,rows([link],[]),sync,prepare)).toEqual({drafted:false});
 expect(prepare).not.toHaveBeenCalled();
});
it('respects an authorization failure before inspecting any issues',async()=>{
 const sync=vi.fn(),prepare=vi.fn();
 await expect(prepareProfileAgentDraft(id,rows([]),sync,prepare)).rejects.toMatchObject({status:404});
 expect(sync).not.toHaveBeenCalled();expect(prepare).not.toHaveBeenCalled();
});
