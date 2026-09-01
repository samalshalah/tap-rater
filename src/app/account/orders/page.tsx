import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal, type CustomerPortalOrder } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";
import { formatPrice } from "@/lib/products";

export default async function AccountOrdersPage() {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);
  const pendingPayments = portal.orders.filter((order) => order.paymentStatus === "manual_unpaid");

  return (
    <AccountShell>
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">Orders & Billing</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Orders, invoices, and payments</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Review submitted orders, invoice records, payment status, and recurring Multi-Link billing in one place.
          </p>
        </section>

        {pendingPayments.length ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>Some orders are waiting for payment review before production continues.</p>
          </section>
        ) : null}

        <section className="tr-card p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="tr-eyebrow">Order history</p>
              <h2 className="mt-2 text-lg font-medium text-ink">Submitted orders</h2>
            </div>
            <p className="text-sm text-muted">{portal.orders.length} order{portal.orders.length === 1 ? "" : "s"}</p>
          </div>
          <div className="mt-5 divide-y divide-line overflow-hidden rounded-md border border-line bg-white">
          {portal.orders.length ? (
            portal.orders.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <EmptyState message="No submitted orders are linked to this account yet." />
          )}
          </div>
        </section>

        <section className="tr-card p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="tr-eyebrow">Recurring billing</p>
              <h2 className="mt-2 text-lg font-medium text-ink">Multi-Link subscriptions</h2>
            </div>
            <p className="text-sm text-muted">{portal.subscriptions.length} active record{portal.subscriptions.length === 1 ? "" : "s"}</p>
          </div>
          <div className="mt-5 grid gap-2">
            {portal.subscriptions.length ? (
              portal.subscriptions.map((subscription) => (
                <article key={subscription.id} className="rounded-md border border-line bg-white px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-medium text-ink">Hosted Multi-Link page</h3>
                      <a href={subscription.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-brand">
                        {subscription.hostedPageUrl}
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm md:justify-end">
                      <StatusBadge label={formatStatus(subscription.status)} />
                      <StatusBadge label={formatStatus(subscription.lifecycleStatus)} />
                      <StatusBadge label={subscription.currentPeriodEnd ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : "Renewal not recorded"} />
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState message="No recurring Multi-Link billing is connected to this account." />
            )}
          </div>
        </section>
      </div>
    </AccountShell>
  );
}

function OrderCard({ order }: { order: CustomerPortalOrder }) {
  const reference = formatOrderReference(order.reference);
  const hasInvoiceActions = Boolean(order.invoiceUrl || order.receiptUrl);

  return (
    <article id={`order-${reference}`} className="scroll-mt-28 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm uppercase text-ink">{reference}</h3>
            {order.createdAt ? <span className="text-sm text-muted">{new Date(order.createdAt).toLocaleDateString()}</span> : null}
            <StatusBadge label={formatCustomerOrderStatus(order)} />
            <StatusBadge label={formatPayment(order)} tone={order.paymentStatus === "manual_unpaid" ? "warning" : "neutral"} />
          </div>
          <div className="mt-3 grid gap-2">
            {order.items.map((item) => {
              const multiLinkHref = getMultiLinkHref(item.lineItem);
              return (
                <div key={item.id} className="grid gap-2 rounded-md bg-soft px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_160px_56px_96px_auto] md:items-center">
                  <p className="text-ink">{item.title}</p>
                  <p className="text-muted">{item.optionLabel}</p>
                  <p className="text-muted md:text-center">Qty {item.quantity}</p>
                  <p className="text-ink md:text-right">{formatPrice(item.lineSubtotalCents)}</p>
                  {multiLinkHref ? (
                    <Link href={multiLinkHref} className="tr-button-ghost justify-center whitespace-nowrap">
                      Set up landing page
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>Payment method: {order.paymentMethodLabel}</span>
            {order.paymentReference ? <span>Reference: {order.paymentReference}</span> : null}
            {order.shippingAmountCents > 0 ? <span>Shipping: {formatPrice(order.shippingAmountCents)}</span> : null}
          </div>
          {hasInvoiceActions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {order.invoiceUrl ? <a href={order.invoiceUrl} target="_blank" rel="noreferrer" className="tr-button-ghost">Invoice</a> : null}
              {order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="tr-button-ghost">Receipt</a> : null}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-left lg:text-right">
          <p className="text-xs uppercase text-muted">Order total</p>
          <p className="mt-1 text-lg font-medium text-ink">{formatPrice(order.totalCents)}</p>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warning" }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${tone === "warning" ? "bg-amber-50 text-amber-900" : "bg-soft text-muted"}`}>
      {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-soft p-5 text-sm text-muted">{message}</div>;
}

function formatPayment(order: { status: string; paymentStatus?: string }) {
  if (order.paymentStatus === "manual_unpaid") return "submitted - payment pending review";
  if (order.status === "paid" || order.paymentStatus === "paid") return "paid";
  return formatStatus(order.status);
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatCustomerOrderStatus(order: Pick<CustomerPortalOrder, "paymentStatus" | "shippingStatus" | "status">) {
  if (order.shippingStatus === "delivered") return "Delivered";
  if (order.shippingStatus === "shipped") return "Shipped";
  if (order.paymentStatus === "manual_unpaid") return "Order received";
  if (order.status === "paid" || order.paymentStatus === "paid") return "Preparing order";
  return "Order submitted";
}

function getMultiLinkHref(item: CustomerPortalOrder["items"][number]["lineItem"]) {
  const optionId = item.optionId?.toLowerCase() ?? "";
  const optionLabel = item.optionLabel?.toLowerCase() ?? "";
  const code = readSetupString(item.setup, "hostedPageCode") ?? readSetupString(item.setup, "permanentPageCode");

  if (item.destinationMode !== "HOSTED" && optionId !== "hosted_multilink" && !optionLabel.includes("multi-link")) {
    return null;
  }

  return code ? `/account/stands?code=${encodeURIComponent(code)}#multi-link-editor` : "/account/stands#multi-link-editor";
}

function readSetupString(setup: Record<string, unknown> | undefined, key: string) {
  const value = setup?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
