import {MarketingGate} from '@/components/account/marketing-gate';
import {AccountShell} from '@/components/account/account-shell';
import {LocalDashboard} from '@/components/account/local-dashboard';
import {requireCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Business Information',robots:{index:false,follow:false}};
export default async function Page(){const session=await requireCustomer();return <AccountShell><MarketingGate email={session.email}><LocalDashboard initialTab="business" preferenceKey={session.email.toLowerCase()}/></MarketingGate></AccountShell>;}
