import {Suspense, type ReactNode } from "react";
import {customerNavigationLocations} from '@/lib/customer-navigation-locations';
import { AccountNavigation, AccountContext } from '@/components/account/account-navigation';

import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerExperience} from '@/lib/customer-experience';
import {navigationForPurchases} from '@/lib/customer-navigation';
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session=await requireCustomer();
  const experience=await getCustomerExperience(session.email);
  let locations:Awaited<ReturnType<typeof customerNavigationLocations>>=[];let locationsError=false;
  if(experience.service)try{locations=await customerNavigationLocations(session.email);}catch{locationsError=true;}
  return (
    <main className="tr-account-shell tr-workspace-shell tr-client-shell tr-app-shell min-h-screen bg-soft">
      <Suspense fallback={<aside className="tr-workspace-sidebar">Loading navigation…</aside>}><AccountNavigation links={navigationForPurchases(experience)} locations={locations} locationsError={locationsError}/></Suspense>
      <div className="tr-app-main"><Suspense fallback={<div className="tr-app-context"/>}><AccountContext locations={locations} enabled={experience.service} locationsError={locationsError}/></Suspense><div id="workspace-content" className="tr-workspace-content" tabIndex={-1}>{children}</div></div>
    </main>
  );
}
