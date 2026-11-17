import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({cursor:0,attempt:{current:null as any},error:vi.fn()}));
vi.mock('react',async original=>({...await original<object>(),useRef:()=>state.attempt,useState:()=>{const values=[1,'buyer@example.test',{id:'preview-qa'},true,false,'',3,'Jane','Doe',''];const index=state.cursor++;return [values[index],index===5?state.error:()=>{}];}}));
import {ReviewsPurchaseForm} from '@/components/account/reviews-purchase-form';
beforeEach(()=>{state.cursor=0;state.attempt.current=null;state.error.mockClear();vi.stubGlobal('sessionStorage',{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn()});});
afterEach(()=>vi.unstubAllGlobals());
it('rotates a terminal attempt only after the server confirms it ended',async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce({ok:false,json:async()=>({error:'Start a new purchase attempt.'})}).mockResolvedValueOnce({ok:false,json:async()=>({error:'Checkout is unavailable.'})});
 vi.stubGlobal('fetch',fetchMock);
 const tree=ReviewsPurchaseForm({guest:true});
 const form=tree.props.children.find((child:any)=>child?.type==='form');
 await form.props.onSubmit({preventDefault(){}});
 const first=JSON.parse(fetchMock.mock.calls[0][1].body).attempt;
 expect(sessionStorage.removeItem).toHaveBeenCalledOnce();
 expect(state.error).toHaveBeenLastCalledWith('Your previous checkout has ended. Select Continue to checkout to try again.');
 await form.props.onSubmit({preventDefault(){}});
 expect(JSON.parse(fetchMock.mock.calls[1][1].body).attempt).not.toBe(first);
});
it('retains the same attempt after ambiguous failures to avoid duplicate checkout',async()=>{
 const fetchMock=vi.fn().mockRejectedValue(Error('Network interrupted'));vi.stubGlobal('fetch',fetchMock);
 const tree=ReviewsPurchaseForm({guest:true});
 const form=tree.props.children.find((child:any)=>child?.type==='form');
 await form.props.onSubmit({preventDefault(){}});await form.props.onSubmit({preventDefault(){}});
 expect(JSON.parse(fetchMock.mock.calls[0][1].body).attempt).toBe(JSON.parse(fetchMock.mock.calls[1][1].body).attempt);
 expect(sessionStorage.removeItem).not.toHaveBeenCalled();
});
