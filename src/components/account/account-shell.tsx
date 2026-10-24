import type { ReactNode } from "react";
import { AccountNavigation } from './account-navigation';

import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerExperience} from '@/lib/customer-experience';
import {navigationForPurchases} from '@/lib/customer-navigation';
export async function AccountShell({ children, overview = false }: { children: ReactNode; overview?: boolean }) {
  const session=await requireCustomer();
  const experience=await getCustomerExperience(session.email);
  return (
    <main className="tr-account-shell tr-workspace-shell tr-client-shell min-h-screen bg-soft" data-overview={overview}>
      <AccountNavigation links={navigationForPurchases(experience)} />
      <div className="tr-workspace-content">{children}</div>
    </main>
  );
}
