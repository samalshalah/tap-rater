import {AccountShell} from '@/components/account/account-shell';
import {LocalDashboard} from '@/components/account/local-dashboard';
import {requireCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Local management',robots:{index:false,follow:false}};
export default async function Page(){const session=await requireCustomer();return <AccountShell><LocalDashboard key="local" initialTab="listings" preferenceKey={session.email.toLowerCase()}/></AccountShell>;}
