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
 const [{data:customer,error},{portal}]=await Promise.all([getSupabaseAdmin().from('customers').select('name,email,phone').eq('email',session.email).maybeSingle(),getCustomerExperience(session.email)]);
 return <AccountShell><div className="grid gap-4"><header className="tr-account-page-header"><h1>Account</h1></header>{error||!customer?<p role="alert">Your account details could not be loaded. Please refresh.</p>:<AccountDetails name={customer.name||''} phone={customer.phone||''} email={session.email}/>}
 <section className="tr-card p-4"><h2 className="text-base font-semibold">Business information</h2><div className="mt-3 divide-y divide-slate-100">
 {portal.businesses.map(business=><article key={business.id} className="py-3"><h3 className="font-semibold">{business.businessName}</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-muted">Address</dt><dd className="mt-1 whitespace-pre-line">{business.address||'Not added'}</dd></div><div><dt className="text-muted">Phone</dt><dd className="mt-1">{business.phone||'Not added'}</dd></div><div><dt className="text-muted">Website</dt><dd className="mt-1 break-all">{business.websiteUrl||'Not added'}</dd></div></dl></article>)}
 {portal.businesses.length===0&&<p className="py-3 text-sm text-muted">No business information added yet.</p>}</div></section>
 <section className="tr-card flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="text-base font-semibold">Security & billing</h2><div className="flex gap-2"><Link className="tr-button-ghost" href="/account/forgot-password">Reset password</Link><Link className="tr-button-ghost" href="/account/orders">Orders & billing</Link></div></section></div></AccountShell>;
}
