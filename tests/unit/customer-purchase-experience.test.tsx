import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({experience:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomer:async()=>({email:'client@example.test'})}));
vi.mock('@/lib/customer-experience',()=>({getCustomerExperience:m.experience}));
vi.mock('@/components/account/account-shell',()=>({AccountShell:({children}:{children:ReactNode})=>children}));
vi.mock('@/components/account/marketing-gate',()=>({MarketingGate:({children}:{children:ReactNode})=>createElement('section',{'data-testid':'service-setup'},children)}));
vi.mock('@/components/account/local-dashboard',()=>({LocalDashboard:()=>createElement('div',null,'Service dashboard')}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('redirect:'+url);}}));
import StandsPage from '@/app/account/stands/page';
import AccountPage from '@/app/account/page';
import {navigationForPurchases} from '@/lib/customer-navigation';
const portal={configured:true,customer:{name:'Test'},orders:[],stands:[],devices:[],subscriptions:[]};
beforeEach(()=>vi.clearAllMocks());
it.each([{service:false,stands:true},{service:true,stands:false},{service:true,stands:true}])('renders the right dashboard and navigation for %j',async access=>{
 m.experience.mockResolvedValue({portal,...access,unavailable:false});
 const html=renderToStaticMarkup(await AccountPage());
 expect(html.includes('Service dashboard')).toBe(access.service);
 expect(html.includes('service-setup')).toBe(access.service);
 expect(html.includes('Stands overview')).toBe(access.stands);
 expect(html).not.toContain('<details');
 const links=navigationForPurchases(access).map(l=>l.href);
 expect(links.includes('/account/stands')).toBe(access.stands);
 expect(links.includes('/account/reviews')).toBe(access.service);
 expect(links.includes('/account/heatmap')).toBe(access.service);
 expect(links).toContain('/account/orders');
});
it('does not mount Google setup when service access is unavailable',async()=>{
 m.experience.mockResolvedValue({portal,service:false,stands:true,unavailable:true});
 const html=renderToStaticMarkup(await AccountPage());
 expect(html).toContain('temporarily unavailable');expect(html).toContain('Stands overview');expect(html).not.toContain('service-setup');
});

it('redirects a service-only customer away from the direct stand page',async()=>{
 m.experience.mockResolvedValue({portal,service:true,stands:false,unavailable:false});
 await expect(StandsPage()).rejects.toThrow('redirect:/account');
});
