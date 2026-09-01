import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal, type CustomerPortalData, type CustomerPortalStand } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";

export default async function AccountPage() {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);
  const firstName = portal.customer?.name?.trim().split(/\s+/)[0] ?? "there";
  const actions = buildDashboardActions(portal);
  const latestOrder = portal.orders[0];

  return (
    <AccountShell>
      {!portal.configured ? <PortalMessage message="Customer account storage is not configured yet." /> : null}
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">Overview</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Welcome, {firstName}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Use this dashboard for the next step only. Full order records, stand setup, and billing are separated to keep the account easy to manage.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Purchased stands" value={String(portal.stands.reduce((total, stand) => total + stand.quantity, 0))} />
          <SummaryCard label="Open orders" value={String(portal.orders.filter((order) => order.shippingStatus !== "delivered").length)} />
          <SummaryCard label="Multi-Link pages" value={String(portal.stands.filter((stand) => stand.kind === "multilink").length)} />
        </section>

        <section className="tr-card p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="tr-eyebrow">Next actions</p>
              <h2 className="mt-2 text-xl font-medium text-ink">What needs attention</h2>
            </div>
            <Link href="/account/stands" className="tr-button-ghost self-start md:self-auto">View my stands</Link>
          </div>
          <div className="mt-5 grid gap-3">
            {actions.length ? actions.map((action) => <ActionRow key={action.id} {...action} />) : <EmptyState message="No action is needed right now." />}
          </div>
        </section>

        {latestOrder ? (
          <section className="tr-card p-5">
            <p className="tr-eyebrow">Latest order</p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-medium text-ink">{formatOrderReference(latestOrder.reference)}</h2>
                <p className="mt-1 text-sm text-muted">
                  {latestOrder.itemCount} configured stand{latestOrder.itemCount === 1 ? "" : "s"} · {formatStatus(latestOrder.productionStatus)} · {formatStatus(latestOrder.shippingStatus)}
                </p>
              </div>
              <Link href="/account/orders" className="tr-button-ghost self-start md:self-auto">Order history</Link>
            </div>
          </section>
        ) : null}
      </div>
    </AccountShell>
  );
}

function buildDashboardActions(portal: CustomerPortalData) {
  const actions = [];
  const proofStand = portal.stands.find((stand) => stand.proofStatus === "needs_review");
  const multiLinkStand = portal.stands.find((stand) => stand.kind === "multilink" && !stand.hostedPageUrl);
  const editableMultiLinkStand = portal.stands.find((stand) => stand.kind === "multilink" && stand.hostedPageUrl);
  const paymentOrder = portal.orders.find((order) => order.paymentStatus === "manual_unpaid");

  if (proofStand) {
    actions.push({
      id: "proof",
      title: "Review branded proof",
      body: proofStand.title,
      href: "/account/stands",
      cta: "Open stand"
    });
  }

  if (multiLinkStand) {
    actions.push({
      id: "multilink-setup",
      title: "Multi-Link setup is pending",
      body: multiLinkStand.title,
      href: "/account/stands",
      cta: "View stand"
    });
  } else if (editableMultiLinkStand) {
    actions.push({
      id: "multilink-edit",
      title: "Manage Multi-Link page",
      body: editableMultiLinkStand.businessName ?? editableMultiLinkStand.title,
      href: "/account/stands#multi-link-editor",
      cta: "Edit links"
    });
  }

  if (paymentOrder) {
    actions.push({
      id: "payment",
      title: "Payment pending review",
      body: formatOrderReference(paymentOrder.reference),
      href: "/account/billing",
      cta: "View billing"
    });
  }

  return actions.slice(0, 3);
}

function ActionRow({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-base font-medium text-ink">{title}</h3>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
      <Link href={href} className="tr-button-ghost self-start md:self-auto">{cta}</Link>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium text-ink">{value}</p>
    </div>
  );
}

function PortalMessage({ message }: { message: string }) {
  return <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-ink">{message}</div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-soft p-5 text-sm text-muted">{message}</div>;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}
