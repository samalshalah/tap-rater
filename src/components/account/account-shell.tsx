import type { ReactNode } from "react";
import { AccountNavigation } from './account-navigation';

export function AccountShell({ children, overview = false }: { children: ReactNode; overview?: boolean }) {
  return (
    <main className="tr-account-shell tr-workspace-shell min-h-screen bg-soft" data-overview={overview}>
      <AccountNavigation />
      <div className="tr-workspace-content">{children}</div>
    </main>
  );
}
