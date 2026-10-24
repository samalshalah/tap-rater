import {Suspense, type ReactNode } from "react";
import {customerNavigationLocations} from '@/lib/customer-navigation-locations';
import { AccountNavigation } from './account-navigation';

import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerExperience} from '@/lib/customer-experience';
import {navigationForPurchases} from '@/lib/customer-navigation';
export async function AccountShell({ children, overview = false }: { children: ReactNode; overview?: boolean }) {
  const session=await requireCustomer();
  const experience=await getCustomerExperience(session.email);
  let locations:Awaited<ReturnType<typeof customerNavigationLocations>>=[];let locationsError=false;
  if(experience.service)try{locations=await customerNavigationLocations(session.email);}catch{locationsError=true;}
  return (
    <main className="tr-account-shell tr-workspace-shell tr-client-shell min-h-screen bg-soft" data-overview={overview}>
      <Suspense fallback={<aside className="tr-workspace-sidebar">Loading navigation…</aside>}><AccountNavigation links={navigationForPurchases(experience)} locations={locations} locationsError={locationsError}/></Suspense>
      <div className="tr-workspace-content">{children}</div>
    </main>
  );
}
