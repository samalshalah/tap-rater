import Link from 'next/link';
import {LockKeyhole} from 'lucide-react';
import {WorkspacePageHeader} from '@/components/account/workspace-ui';
import {AccountShell} from '@/components/account/account-shell';
import {AccountDetails} from '@/components/account/account-details';
import {requireCustomer} from '@/lib/customer-auth';
import {getSupabaseAdmin} from '@/lib/db';
export const dynamic='force-dynamic';
export const metadata={title:'Account Settings',robots:{index:false,follow:false}};
export default async function AccountSettingsPage(){
 const session=await requireCustomer();
 const {data:customer,error}=await getSupabaseAdmin().from('customers').select('name,email,phone').eq('email',session.email).maybeSingle();
 return <AccountShell><WorkspacePageHeader title="Account Settings"/><div className="grid gap-3">{error||!customer?<p role="alert">Your account details could not be loaded. Please refresh.</p>:<AccountDetails name={customer.name||''} phone={customer.phone||''} email={session.email}/>}
 <section aria-label="Security" className="tr-stand-row tr-card tr-settings-row p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1"><LockKeyhole size={22} className="text-muted" aria-hidden="true"/></div><div className="min-w-0"><h3 className="text-base font-medium text-ink">Security</h3><p className="mt-1 text-xs text-muted">Password sign-in for {session.email}. We email you a secure link to set a new password.</p></div></div><div className="flex shrink-0 flex-wrap items-center gap-2"><Link className="tr-button-primary" href="/account/forgot-password">Reset password</Link></div></div></section></div></AccountShell>;
}
