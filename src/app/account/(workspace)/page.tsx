import {getInitialDashboardSnapshot} from '@/lib/initial-dashboard-snapshot';
import {getCustomerWorkspaceExperience} from '@/lib/customer-workspace-experience';
import {getCustomerPortal} from '@/lib/customer-portal';
import {CustomerOverview} from '@/components/account/customer-overview';
import {AccountShell} from '@/components/account/account-shell';
import {requireCustomer} from '@/lib/customer-auth';
import {getCustomerReviewSubscription} from '@/lib/customer-review-subscription';

export default async function AccountPage(){
  const { email } = await requireCustomer();
  const experiencePromise = getCustomerWorkspaceExperience(email);
  const [portal, { configured, service, unavailable, multilink }, reviews, reviewSubscription] = await Promise.all([
    getCustomerPortal(email),
    experiencePromise,
    experiencePromise.then(({ service }) => service ? getInitialDashboardSnapshot(email) : null),
    experiencePromise.then(({ service }) => service ? getCustomerReviewSubscription(email).catch(() => undefined) : undefined)
  ]);

  return <AccountShell overview>
    {!configured && <p role="alert">Your account is temporarily unavailable. Please try again shortly.</p>}
    {unavailable && <p role="alert">Google Reviews access is temporarily unavailable.</p>}
    <CustomerOverview portal={portal} reviewsEnabled={service} reviews={reviews} reviewSubscription={reviewSubscription} multiLinkEnabled={multilink} />
  </AccountShell>;
}
