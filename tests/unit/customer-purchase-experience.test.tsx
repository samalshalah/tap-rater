vi.mock('@/lib/initial-dashboard-snapshot',()=>({getInitialDashboardSnapshot:async()=>m.snapshot()}));
vi.mock('@/lib/customer-review-subscription',()=>({getCustomerReviewSubscription:async()=>null}));
import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({experience:vi.fn(),snapshot:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomer:async()=>({email:'client@example.test'})}));
vi.mock('@/lib/customer-workspace-experience',()=>({getCustomerWorkspaceExperience:async(...args:unknown[])=>({...await m.experience(...args),configured:true})}));
vi.mock('@/lib/customer-portal',async original=>({...await original<typeof import('@/lib/customer-portal')>(),getCustomerPortal:async()=>(await m.experience()).portal}));
vi.mock('@/lib/customer-experience',()=>({getCustomerExperience:m.experience}));
vi.mock('@/components/account/account-shell',()=>({AccountShell:({children}:{children:ReactNode})=>children}));
vi.mock('@/components/account/marketing-gate',()=>({MarketingGate:({children}:{children:ReactNode})=>createElement('section',{'data-testid':'service-setup'},children)}));
vi.mock('@/components/account/local-dashboard',()=>({LocalDashboard:()=>createElement('div',null,'Service dashboard')}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('redirect:'+url);}}));
import StandsPage from '@/app/account/(workspace)/stands/page';
import StandsOverviewPage from '@/app/account/(workspace)/stands/overview/page';
import AccountPage from '@/app/account/(workspace)/page';
import ReviewPerformancePage from '@/app/account/(workspace)/reviews/overview/page';
import {navigationForPurchases,groupCustomerNavigation,isNavigationActive,reviewPerformancePath} from '@/lib/customer-navigation';
const portal={configured:true,customer:{name:'Test'},orders:[],stands:[],devices:[],subscriptions:[]};
beforeEach(()=>{vi.clearAllMocks();m.snapshot.mockResolvedValue(null);});
it.each([{service:false,stands:true},{service:true,stands:false},{service:true,stands:true}])('renders the right dashboard and navigation for %j',async access=>{
 m.experience.mockResolvedValue({portal,...access,unavailable:false});
 const html=renderToStaticMarkup(await AccountPage());
 expect(html).toContain('<h1>Overview</h1>');
 expect(html).toContain('Products</h2>');
 expect(html).toContain('Notifications</h2>');
 expect(html.includes('Google Reviews performance</h2>')).toBe(access.service);
 expect(html).not.toContain('service-setup');
 expect(m.snapshot).toHaveBeenCalledTimes(Number(access.service));
 expect(html).not.toContain('<details');
 const links=navigationForPurchases(access).map(l=>l.href);
 expect(links.includes('/account/stands')).toBe(access.stands);
 expect(links.includes('/account/reviews')).toBe(access.service);
 expect(links.includes('/account/locations')).toBe(access.service);
 expect(links).not.toContain('/account/heatmap');
 expect(links).toContain('/account/orders');
});
it('does not mount Google setup when service access is unavailable',async()=>{
 m.experience.mockResolvedValue({portal,service:false,stands:true,unavailable:true});
 const html=renderToStaticMarkup(await AccountPage());
 expect(html).toContain('temporarily unavailable');expect(html).toContain('Products</h2>');expect(html).not.toContain('service-setup');
});

it('shows purchased products, service access, review performance and current notifications together', async () => {
 m.experience.mockResolvedValue({service:true,stands:true,multilink:true,portal:{...portal,
  orders:[{reference:'fixture-order',status:'paid',paymentStatus:'paid',itemCount:4}],
  subscriptions:[{permanentCode:'owned-page',lifecycleStatus:'ACTIVE'}]
 }});
 m.snapshot.mockResolvedValue({locations:[
  {connected:true,review_count:10,rating_summary:{sum:48,count:10},active_draft_count:2},
  {connected:false,review_count:0}
 ]});
 const html=renderToStaticMarkup(await AccountPage());
 expect(html).toMatch(/Paid stands<\/dt><dd[^>]*>4<\/dd>/);
 expect(html).toContain('Active · Managed by Tap Rater');
 expect(html).toContain('1 page · 1 active');
 expect(html).toContain('4.8 / 5');
 expect(html).toContain('2 current reply drafts');
 expect(html).toContain('1 Google location needs a connection check');
});

it('keeps the detailed performance page behind Google Reviews setup',async()=>{
 const html=renderToStaticMarkup(await ReviewPerformancePage());
 expect(html).toContain('service-setup');
 expect(html).toContain('Service dashboard');
});

it('redirects a service-only customer away from the direct stand page',async()=>{
 m.experience.mockResolvedValue({portal,service:true,stands:false,unavailable:false});
 await expect(StandsPage()).rejects.toThrow('redirect:/account');
});

it('keeps a combined customer stand overview separate from Google setup',async()=>{
 m.experience.mockResolvedValue({portal,service:true,stands:true,unavailable:false});
 const html=renderToStaticMarkup(await StandsOverviewPage());
 expect(html).toContain('Stands overview');expect(html).not.toContain('Service dashboard');expect(html).not.toContain('service-setup');
 expect(navigationForPurchases({service:true,stands:true}).map(l=>l.href)).not.toContain('/account/stands/overview');
});
it('does not expose a stand overview to service-only customers',async()=>{
 m.experience.mockResolvedValue({portal,service:true,stands:false,unavailable:false});
 await expect(StandsOverviewPage()).rejects.toThrow('redirect:/account');
});

it('groups both products with one shared account section and one active stand link',()=>{
 const groups=groupCustomerNavigation(navigationForPurchases({service:true,stands:true,multilink:true}));
 expect(groups.map(g=>g.label)).toEqual(['Overview','Google Reviews','Stands','Multi-Link','Account']);
 expect(groups[0].links.map(l=>l.href)).toEqual(['/account']);
 expect(groups[1].links.map(l=>l.href)).toContain(reviewPerformancePath);
 expect(groups[2].links.map(l=>l.href)).toEqual(['/account/stands']);
 expect(groups[3].links.map(l=>l.href)).toEqual(['/account/multilink']);
 expect(isNavigationActive(reviewPerformancePath,'/account/reviews')).toBe(false);
 expect(isNavigationActive('/account/stands/overview','/account/stands')).toBe(false);
 expect(isNavigationActive('/account/stands/overview','/account/stands/overview')).toBe(true);
});
