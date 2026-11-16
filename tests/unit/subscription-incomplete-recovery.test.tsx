import React from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const state=vi.hoisted(()=>({cursor:0,status:'incomplete'}));
vi.mock('react',async original=>({...await original<object>(),useEffect:()=>{},useState:()=>{const values=[{status:state.status,locations:1,cancel_at_period_end:false,billingAvailable:false},false,false,''];return [values[state.cursor++],()=>{}];}}));
import {MarketingPurchaseCard} from '@/components/account/marketing-purchase';
it('provides support recovery when incomplete checkout cannot open billing',()=>{
 state.cursor=0;
 const html=renderToStaticMarkup(MarketingPurchaseCard({available:true}));
 expect(html).toContain('Checkout not completed');
 expect(html).toContain('href="/contact-us"');
 expect(html).toContain('before starting another subscription');
 expect(html).not.toContain('Manage subscription &amp; invoices');
});
