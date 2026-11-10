import { AccountShell } from '@/components/account/account-shell';
import { LocalDashboard } from '@/components/account/local-dashboard';
import { MarketingGate } from '@/components/account/marketing-gate';
import { requireCustomer } from '@/lib/customer-auth';
import { getInitialDashboardSnapshot } from '@/lib/initial-dashboard-snapshot';

export const metadata = { title: 'Google Reviews Performance', robots: { index: false, follow: false } };

export default async function ReviewPerformancePage() {
  const { email } = await requireCustomer();
  const snapshot = await getInitialDashboardSnapshot(email);

  return (
    <AccountShell>
      <MarketingGate email={email}>
        <LocalDashboard initialSnapshot={snapshot} preferenceKey={email.toLowerCase()} />
      </MarketingGate>
    </AccountShell>
  );
}
