import {MarketingGate} from '@/components/account/marketing-gate';
import {AccountShell} from '@/components/account/account-shell';
import {CustomerLocations} from '@/components/account/customer-locations';
import {requireCustomer} from '@/lib/customer-auth';
import {accountBusinesses} from '@/lib/account-business-drafts';
export const dynamic='force-dynamic';
export const metadata={title:'Locations',robots:{index:false,follow:false}};
export default async function Page(){const session=await requireCustomer();const businesses=await accountBusinesses(session.email);return <AccountShell><MarketingGate email={session.email}><CustomerLocations businesses={businesses}/></MarketingGate></AccountShell>;}
