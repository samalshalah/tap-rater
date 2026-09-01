import { AccountShell } from "@/components/account/account-shell";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountPage() {
  const session = await requireCustomer();
  const [context, portal] = await Promise.all([
    getHostedPageEditorContext(session.email),
    getCustomerPortal(session.email)
  ]);

  return (
    <AccountShell>
      {!context.configured ? <PortalMessage message={context.message} /> : null}
      {context.configured ? <CustomerAccountSummary email={session.email} portal={portal} hasHostedPage={Boolean(context.page)} /> : null}
      {context.configured && context.page ? (
        <div className="mt-6">
          <HostedPageEditor initialPage={context.page} />
        </div>
      ) : null}
    </AccountShell>
  );
}

function PortalMessage({ message }: { message: string }) {
  return <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">{message}</div>;
}

function CustomerAccountSummary({ email, portal, hasHostedPage }: { email: string; portal: Awaited<ReturnType<typeof getCustomerPortal>>; hasHostedPage: boolean }) {
  const businessNames = portal.businesses.map((business) => business.businessName);
  const latestOrder = portal.orders[0];
  const activeSubscription = portal.subscriptions.find((subscription) => subscription.lifecycleStatus === "ACTIVE") ?? portal.subscriptions[0];

  return (
    <div className="grid gap-4">
      <section className="tr-card p-6">
        <p className="tr-eyebrow">Account</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Your Tap Rater workspace</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Tap Rater uses this account for proof review, order updates, billing, and Multi-Link editing when a hosted page is included with the order.
        </p>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          <SummaryTile label="Email" value={email} />
          <SummaryTile label="Businesses" value={businessNames.length ? businessNames.join(", ") : "Setup in review"} />
          <SummaryTile label="Latest order" value={latestOrder ? `${latestOrder.status.replaceAll("_", " ")} / ${(latestOrder.paymentStatus ?? "payment pending").replaceAll("_", " ")}` : "No orders yet"} />
          <SummaryTile label="Multi-Link" value={hasHostedPage ? "Editable page active" : activeSubscription ? activeSubscription.lifecycleStatus.replaceAll("_", " ") : "Not included"} />
        </dl>
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-soft p-3">
      <dt className="font-semibold text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
