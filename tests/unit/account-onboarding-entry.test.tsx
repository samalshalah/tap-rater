import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({service:true,portal:vi.fn(),snapshot:vi.fn(),subscription:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomer:async()=>({email:'buyer@example.test'})}));
vi.mock('@/lib/customer-workspace-experience',()=>({getCustomerWorkspaceExperience:async()=>({configured:true,service:m.service,unavailable:false,multilink:false})}));
vi.mock('@/lib/customer-portal',()=>({getCustomerPortal:m.portal}));
vi.mock('@/lib/initial-dashboard-snapshot',()=>({getInitialDashboardSnapshot:m.snapshot}));
vi.mock('@/lib/customer-review-subscription',()=>({getCustomerReviewSubscription:m.subscription}));
vi.mock('@/components/account/marketing-gate',()=>({MarketingGate:()=>null}));
vi.mock('@/components/account/account-shell',()=>({AccountShell:()=>null}));
vi.mock('@/components/account/customer-overview',()=>({CustomerOverview:()=>null}));
import AccountPage from '@/app/account/(workspace)/page';
import {MarketingGate} from '@/components/account/marketing-gate';
import {CustomerOverview} from '@/components/account/customer-overview';
beforeEach(()=>{vi.clearAllMocks();m.service=true;m.portal.mockResolvedValue({});m.snapshot.mockResolvedValue({});m.subscription.mockResolvedValue({});});
it('routes Reviews account landing through saved onboarding before showing overview',async()=>{
 const page=await AccountPage();const content=page.props.children[2];
 expect(content.type).toBe(MarketingGate);expect(content.props.email).toBe('buyer@example.test');
 expect(content.props.children.type).toBe(CustomerOverview);
});
it('keeps stand-only accounts out of Reviews onboarding',async()=>{
 m.service=false;const page=await AccountPage();
 expect(page.props.children[2].type).toBe(CustomerOverview);
 expect(m.snapshot).not.toHaveBeenCalled();expect(m.subscription).not.toHaveBeenCalled();
});
