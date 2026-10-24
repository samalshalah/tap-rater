import Link from 'next/link';
import {AccountShell} from '@/components/account/account-shell';
import {AccountDetails} from '@/components/account/account-details';
import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerExperience} from '@/lib/customer-experience';
import {getSupabaseAdmin} from '@/lib/db';
export const dynamic='force-dynamic';
export const metadata={title:'Account',robots:{index:false,follow:false}};
export default async function AccountSettingsPage(){
 const session=await requireCustomer();
 const [{data:customer,error},{service,multilink,stands}]=await Promise.all([getSupabaseAdmin().from('customers').select('name,email,phone').eq('email',session.email).maybeSingle(),getCustomerExperience(session.email)]);
 return <AccountShell><div className="grid gap-4"><header className="tr-account-page-header"><h1>Account</h1></header>{error||!customer?<p role="alert">Your account details could not be loaded. Please refresh.</p>:<AccountDetails name={customer.name||''} phone={customer.phone||''} email={session.email}/>}
 <section className="tr-card p-4"><h2 className="text-base font-semibold">Business settings</h2><div className="mt-3 divide-y divide-slate-100">
 {service&&<Row title="Google business profiles" description="Business information, hours, photos and categories." href="/account/profile" action="Manage profiles"/>}
 {multilink&&<Row title="Multi-Link business pages" description="Business name, logo and links." href="/account/multilink" action="Edit business pages"/>}
 {stands&&<Row title="Stand information" description="Business destination and approved design." href="/account/stands" action="View stands"/>}
 {!service&&!multilink&&!stands&&<p className="py-3 text-sm text-muted">Your business tools will appear here after purchase.</p>}</div></section>
 <section className="tr-card flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="text-base font-semibold">Security & billing</h2><div className="flex gap-2"><Link className="tr-button-ghost" href="/account/forgot-password">Reset password</Link><Link className="tr-button-ghost" href="/account/orders">Orders & billing</Link></div></section></div></AccountShell>;
}
function Row({title,description,href,action}:{title:string;description:string;href:string;action:string}){return <div className="flex flex-wrap items-center justify-between gap-3 py-3"><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm text-muted">{description}</p></div><Link className="tr-button-ghost shrink-0" href={href}>{action}</Link></div>}
