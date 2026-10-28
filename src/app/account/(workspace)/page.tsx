import {getInitialDashboardSnapshot} from '@/lib/initial-dashboard-snapshot';
import {getCustomerWorkspaceExperience} from '@/lib/customer-workspace-experience';
import {getCustomerPortal} from '@/lib/customer-portal';
import {MarketingGate} from '@/components/account/marketing-gate';
import {LocalDashboard} from '@/components/account/local-dashboard';
import {StandsOverview} from '@/components/account/stands-overview';
import {AccountShell} from '@/components/account/account-shell';
import {requireCustomer} from '@/lib/customer-auth';
export default async function AccountPage(){
 const session=await requireCustomer();
 const [{configured,service,unavailable},initialSnapshot]=await Promise.all([getCustomerWorkspaceExperience(session.email),getInitialDashboardSnapshot(session.email)]);
 const portal=service?null:await getCustomerPortal(session.email);
 return <AccountShell overview>
 {!configured&&<p role="alert">Your account is temporarily unavailable. Please try again shortly.</p>}
 {unavailable&&<p role="alert">Service access is temporarily unavailable. Your stands are available below.</p>}
 {service?<MarketingGate email={session.email}><LocalDashboard initialSnapshot={initialSnapshot} preferenceKey={session.email.toLowerCase()}/></MarketingGate>:<StandsOverview portal={portal!}/>}
 </AccountShell>;
}
