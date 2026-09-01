import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";

export default async function AccountBillingPage() {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);
  const manualOrders = portal.orders.filter((order) => order.paymentStatus === "manual_unpaid");

  return (
    <AccountShell>
      <section className="tr-card p-6">
        <p className="tr-eyebrow">Billing</p>
        <h2 className="mt-2 text-xl font-medium text-ink">Billing and subscriptions</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Payment review and recurring Multi-Link billing only.</p>
        <div className="mt-6 grid gap-4">
          {manualOrders.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-medium text-ink">Payment pending review</p>
              <p className="mt-1">Tap Rater will confirm payment before releasing the order to production.</p>
            </div>
          ) : null}
          {portal.subscriptions.length ? (
            portal.subscriptions.map((subscription) => (
              <article key={subscription.id} className="rounded-md border border-line bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase text-muted">{subscription.permanentCode}</p>
                    <h3 className="mt-1 text-lg font-medium text-ink">Hosted Multi-Link</h3>
                    <p className="mt-1 text-sm text-muted">$9.99/mo hosted page service</p>
                  </div>
                  <div className="grid gap-2 text-sm md:min-w-64">
                    <BillingLine label="Subscription" value={subscription.status.replaceAll("_", " ")} />
                    <BillingLine label="Lifecycle" value={subscription.lifecycleStatus.replaceAll("_", " ")} />
                    <BillingLine label="Renewal" value={subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Not available"} />
                    <BillingLine label="Cancel state" value={subscription.cancelAtPeriodEnd ? "Cancels at period end" : "Active renewal"} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-line bg-soft p-5 text-sm text-muted">
              No hosted Multi-Link subscription is connected to this account.
            </div>
          )}
        </div>
      </section>
    </AccountShell>
  );
}

function BillingLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4 rounded-md bg-soft px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium capitalize text-ink">{value}</span>
    </p>
  );
}
