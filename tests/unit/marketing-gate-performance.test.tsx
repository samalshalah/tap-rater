import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({state:vi.fn()}));
vi.mock('@/lib/customer-marketing-access',()=>({getCustomerMarketingState:m.state}));
vi.mock('@/components/account/first-login-setup',()=>({FirstLoginSetup:()=>React.createElement('div',null,'Setup flow')}));
import {MarketingGate} from '@/components/account/marketing-gate';
Object.assign(globalThis,{React});
beforeEach(()=>vi.clearAllMocks());
it('opens completed paid accounts directly without an onboarding fetch gate',async()=>{
 m.state.mockResolvedValue({allowed:true,onboardingCompleted:true});expect(renderToStaticMarkup(await MarketingGate({email:'a',children:React.createElement('div',null,'Dashboard')}))).toContain('Dashboard');
});
it('retains setup for incomplete accounts and fails closed for unpaid/completed accounts and outages',async()=>{
 m.state.mockResolvedValue({allowed:true,onboardingCompleted:false});expect(renderToStaticMarkup(await MarketingGate({email:'a',children:'Dashboard'}))).toContain('Setup flow');
 m.state.mockResolvedValue({allowed:false,onboardingCompleted:true});expect(renderToStaticMarkup(await MarketingGate({email:'a',children:'Dashboard'}))).not.toContain('Dashboard');
 m.state.mockRejectedValue(Error('private'));const html=renderToStaticMarkup(await MarketingGate({email:'a',children:'Dashboard'}));expect(html).toContain('Package access unavailable');expect(html).not.toContain('private');
});
