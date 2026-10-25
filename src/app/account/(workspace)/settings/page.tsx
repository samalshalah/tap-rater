import Link from 'next/link';
import {AccountShell} from '@/components/account/account-shell';
import {AccountDetails} from '@/components/account/account-details';
import {requireCustomer} from '@/lib/customer-auth';
import {accountBusinesses} from '@/lib/account-business-drafts';
import {BusinessInformation} from '@/components/account/business-information';
import {getSupabaseAdmin} from '@/lib/db';
export const dynamic='force-dynamic';
export const metadata={title:'Account',robots:{index:false,follow:false}};
export default async function AccountSettingsPage(){
 const session=await requireCustomer();
 const [{data:customer,error},businesses]=await Promise.all([getSupabaseAdmin().from('customers').select('name,email,phone').eq('email',session.email).maybeSingle(),accountBusinesses(session.email).catch(()=>null)]);
 return <AccountShell><div className="grid gap-4"><header className="tr-account-page-header"><h1>Account</h1></header>{error||!customer?<p role="alert">Your account details could not be loaded. Please refresh.</p>:<AccountDetails name={customer.name||''} phone={customer.phone||''} email={session.email}/>}
 {businesses?<BusinessInformation businesses={businesses}/>:<section className="tr-card p-4"><h2 className="text-base font-semibold">Business information</h2><p role="alert" className="mt-3 text-sm">Business information could not be loaded. Please refresh.</p></section>}
 <section className="tr-card flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="text-base font-semibold">Security & billing</h2><div className="flex gap-2"><Link className="tr-button-ghost" href="/account/forgot-password">Reset password</Link><Link className="tr-button-ghost" href="/account/orders">Orders & billing</Link></div></section></div></AccountShell>;
}
