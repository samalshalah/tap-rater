import {AccountShell} from '@/components/account/account-shell';
import {LocalIssueCenter} from '@/components/account/local-issue-center';
import {requireCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Notifications & AI drafts',robots:{index:false,follow:false}};
export default async function Page(){await requireCustomer();return <AccountShell><LocalIssueCenter/></AccountShell>;}
