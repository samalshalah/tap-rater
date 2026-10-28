import {ClientFailureObserver} from '@/components/account/client-failure-observer';
import {Suspense, type ReactNode } from "react";
import { AccountNavigation, AccountContext } from '@/components/account/account-navigation';

import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerWorkspaceExperience} from '@/lib/customer-workspace-experience';
import {navigationForPurchases} from '@/lib/customer-navigation';
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session=await requireCustomer();
  const experience=await getCustomerWorkspaceExperience(session.email);
  const {locations,locationsError}=experience;
  return (
    <main className="tr-account-shell tr-workspace-shell tr-client-shell tr-app-shell min-h-screen bg-soft">
      <ClientFailureObserver/><Suspense fallback={<aside className="tr-workspace-sidebar">Loading navigation…</aside>}><AccountNavigation links={navigationForPurchases(experience)} locations={locations} locationsError={locationsError}/></Suspense>
      <div className="tr-app-main"><Suspense fallback={<div className="tr-app-context"/>}><AccountContext locations={locations} enabled={experience.service} locationsError={locationsError}/></Suspense><div id="workspace-content" className="tr-workspace-content" tabIndex={-1}>{children}</div></div>
    </main>
  );
}
