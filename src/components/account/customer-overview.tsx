import Link from 'next/link';
import { ArrowUpRight, BarChart3, Bell, Layers, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { countMultiLinkPages, countPaidStandQuantity, type CustomerPortalData } from '@/lib/customer-portal';
import { reviewPerformancePath } from '@/lib/customer-navigation';
import type { getCustomerReviewSubscription } from '@/lib/customer-review-subscription';
import { formatOrderReference } from '@/lib/order-reference';
import { date, statusText, subscriptionStatus } from './billing-display';
import type { Snapshot } from './local-dashboard-types';
import { WorkspacePageHeader } from './workspace-ui';

type Props = {
  portal: CustomerPortalData;
  reviewsEnabled: boolean;
  reviews: Snapshot | null;
  reviewSubscription?: Awaited<ReturnType<typeof getCustomerReviewSubscription>>;
  multiLinkEnabled: boolean;
};

const number = new Intl.NumberFormat('en-US');
const inactiveReviewPlans = new Set(['canceled', 'cancelled', 'incomplete_expired', 'checkout']);

export function CustomerOverview({ portal, reviewsEnabled, reviews, reviewSubscription, multiLinkEnabled }: Props) {
  const paidStands = countPaidStandQuantity(portal.orders);
  const complimentaryStands = portal.orders.reduce((count, order) =>
    order.paymentStatus === 'complimentary' ? count + order.itemCount : count, 0);
  const multiLinkPages = countMultiLinkPages(portal.subscriptions);
  const latestOrder = portal.orders[0];
  const pendingSetup = portal.stands.some(stand => stand.multiLinkSetupPending);
  const proofCount = new Set(portal.stands.filter(stand => stand.proofReviewAvailable)
    .map(stand => `${stand.orderId}:${stand.lineItemIndex}`)).size;
  const paymentCount = portal.orders.filter(order => order.paymentStatus === 'manual_unpaid').length;

  const locations = reviews?.locations ?? [];
  const connected = locations.filter(location => location.connected).length;
  const connectionIssues = locations.filter(location => !location.connected || location.last_error).length;
  const replyDrafts = locations.reduce((count, location) => count + Number(location.active_draft_count || 0), 0);
  const reviewCount = locations.reduce((count, location) => count + Number(location.review_count || 0), 0);
  const ratings = locations.reduce((total, location) => ({
    sum: total.sum + Number(location.rating_summary?.sum || 0),
    count: total.count + Number(location.rating_summary?.count || 0)
  }), { sum: 0, count: 0 });

  const alerts = [
    proofCount > 0 && { title: `${proofCount} stand design ${proofCount === 1 ? 'proof' : 'proofs'} to review`, href: '/account/stands' },
    connectionIssues > 0 && { title: `${connectionIssues} Google ${connectionIssues === 1 ? 'location needs' : 'locations need'} a connection check`, href: '/account/locations' },
    replyDrafts > 0 && { title: `${number.format(replyDrafts)} current reply ${replyDrafts === 1 ? 'draft' : 'drafts'}`, href: '/account/reviews' },
    pendingSetup && { title: 'Multi-Link setup is pending', href: '/account/stands' },
    paymentCount > 0 && { title: `${paymentCount} ${paymentCount === 1 ? 'order is' : 'orders are'} awaiting Tap Rater payment review`, href: '/account/orders' }
  ].filter(item => item !== false);

  const plan = reviewSubscription && !inactiveReviewPlans.has(reviewSubscription.status) ? reviewSubscription : null;
  const multiLinkStatuses = new Map<string, number>();
  const seenPages = new Set<string>();
  for (const subscription of portal.subscriptions) {
    const code = subscription.permanentCode.trim();
    if (!code || seenPages.has(code)) continue;
    seenPages.add(code);
    const state = subscriptionStatus(subscription);
    const label = state.toLowerCase() === 'expired' ? 'Expired'
      : state === 'RETIRED_INTERNAL' ? 'Archived'
      : statusText(state);
    multiLinkStatuses.set(label, (multiLinkStatuses.get(label) ?? 0) + 1);
  }

  return (
    <section aria-label="Customer overview">
      <WorkspacePageHeader title="Overview" />
      <p className="mt-2 text-sm text-muted">Your products, service activity, and updates in one place.</p>

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        <OverviewPanel title="Products" icon={<Layers size={18} aria-hidden="true" />}>
          {paidStands + complimentaryStands > 0 || portal.devices.length > 0 ? (
            <dl className="flex flex-wrap gap-x-7 gap-y-3">
              <Metric label="Paid stands" value={number.format(paidStands)} />
              {complimentaryStands > 0 && <Metric label="Complimentary stands" value={number.format(complimentaryStands)} />}
              {portal.devices.length > 0 && <Metric label="Registered devices" value={number.format(portal.devices.length)} />}
            </dl>
          ) : <p className="text-sm text-muted">{portal.customer ? 'No purchased stands yet.' : 'Your products could not be loaded.'}</p>}
          {latestOrder && <p className="text-sm text-muted">
            Latest order <strong className="text-ink">{formatOrderReference(latestOrder.reference)}</strong>
            {latestOrder.createdAt && <> · {date(latestOrder.createdAt)}</>}
            {' · '}{statusText(latestOrder.paymentStatus || latestOrder.status)}
          </p>}
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2">
            {(portal.stands.length > 0 || portal.devices.length > 0) && <OverviewLink href="/account/stands">My Stands</OverviewLink>}
            <OverviewLink href="/account/orders">Orders &amp; Billing</OverviewLink>
          </div>
        </OverviewPanel>

        <OverviewPanel title="Notifications" icon={<Bell size={18} aria-hidden="true" />}>
          {alerts.length > 0 ? (
            <ul className="divide-y divide-line">
              {alerts.map(alert => <li key={alert.title} className="py-2 first:pt-0"><OverviewLink href={alert.href}>{alert.title}</OverviewLink></li>)}
            </ul>
          ) : <p className="text-sm text-muted">
            {(reviewsEnabled && !reviews) || !portal.customer ? 'Some updates are unavailable.' : 'You’re all caught up.'}
          </p>}
          {reviewsEnabled && <OverviewLink href="/account/notifications">Review notification settings</OverviewLink>}
        </OverviewPanel>

        {reviewsEnabled && <OverviewPanel title="Google Reviews performance" icon={<BarChart3 size={18} aria-hidden="true" />}>
          {reviews ? <>
            <dl className="flex flex-wrap gap-x-7 gap-y-3">
              <Metric label="Connected locations" value={`${connected} of ${locations.length}`} />
              <Metric label="Imported reviews" value={number.format(reviewCount)} />
              <Metric label="Average rating" value={ratings.count ? `${(ratings.sum / ratings.count).toFixed(1)} / 5` : '—'} />
            </dl>
            <p className="text-xs text-muted">Based on the reviews currently synced to Tap Rater.</p>
          </> : <p className="text-sm text-muted">Open Google Reviews to finish setup or reload your performance.</p>}
          <OverviewLink href={reviewPerformancePath}>View Google Reviews performance</OverviewLink>
        </OverviewPanel>}

        {(reviewsEnabled || plan || multiLinkPages > 0) && <OverviewPanel title="Subscriptions &amp; access" icon={<Receipt size={18} aria-hidden="true" />}>
          {(reviewsEnabled || plan) && <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Google Reviews</h3>
              <p className="mt-1 text-sm text-muted">{plan ? (
                <>{plan.status === 'trialing' ? 'Trial' : statusText(plan.status)}
                  {plan.locations > 0 && <> · {plan.locations} {plan.locations === 1 ? 'location' : 'locations'}</>}
                  {plan.cancel_at_period_end && ' · Renewal canceled'}</>
              ) : reviewSubscription === undefined ? 'Service access active · Billing details unavailable' : 'Active · Managed by Tap Rater'}</p>
            </div>
            <OverviewLink href="/account/packages">View service access</OverviewLink>
          </div>}
          {multiLinkPages > 0 && <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Multi-Link pages</h3>
              <p className="mt-1 text-sm text-muted">
                {number.format(multiLinkPages)} {multiLinkPages === 1 ? 'page' : 'pages'}
                {Array.from(multiLinkStatuses, ([label, count]) => ` · ${number.format(count)} ${label.toLowerCase()}`).join('')}
              </p>
            </div>
            <OverviewLink href={multiLinkEnabled ? '/account/multilink' : '/account/orders'}>
              {multiLinkEnabled ? 'Manage Multi-Link' : 'View service history'}
            </OverviewLink>
          </div>}
        </OverviewPanel>}
      </div>
    </section>
  );
}

function OverviewPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="tr-card flex min-w-0 flex-col gap-4 p-5">
    <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><span className="text-brand">{icon}</span>{title}</h2>
    {children}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-xl font-semibold text-ink">{value}</dd></div>;
}

function OverviewLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex w-fit max-w-full items-center gap-1 rounded text-sm font-semibold text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
    <span>{children}</span><ArrowUpRight size={14} className="shrink-0" aria-hidden="true" />
  </Link>;
}
