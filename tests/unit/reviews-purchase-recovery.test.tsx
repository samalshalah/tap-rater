import React from 'react';
import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({status:'checkout',cursor:0}));
vi.mock('react',async original=>({...await original<object>(),useEffect:()=>{},useState:()=>{const values=[{status:state.status,locations:1,cancel_at_period_end:false,billingAvailable:false},false,false,''];return [values[state.cursor++],()=>{}];}}));
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
import {ReviewsPurchaseForm} from '@/components/account/reviews-purchase-form';
function find(node:any,type:any):boolean{if(!node)return false;if(Array.isArray(node))return node.some(n=>find(n,type));return node.type===type||find(node.props?.children,type);}
it('lets a signed-in buyer resume an unfinished checkout when sales are available',()=>{
 state.cursor=0;state.status='checkout';expect(find(MarketingPurchaseCard({available:true}),ReviewsPurchaseForm)).toBe(true);
 state.cursor=0;expect(find(MarketingPurchaseCard({available:false}),ReviewsPurchaseForm)).toBe(false);
 state.cursor=0;state.status='active';expect(find(MarketingPurchaseCard({available:true}),ReviewsPurchaseForm)).toBe(false);
});
