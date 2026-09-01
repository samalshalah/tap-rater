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
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-medium text-ink">Payment pending review</p>
            <p className="mt-1">Tap Rater will confirm payment details before releasing affected orders to production.</p>
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
          <div className="mt-5 grid gap-3">
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
          <div className="mt-5 grid gap-3">
            {portal.subscriptions.length ? (
              portal.subscriptions.map((subscription) => (
                <article key={subscription.id} className="rounded-md border border-line bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-mono text-xs uppercase text-muted">{subscription.permanentCode}</p>
                      <h3 className="mt-1 text-base font-medium text-ink">Hosted Multi-Link page</h3>
                      <a href={subscription.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-brand">
                        {subscription.hostedPageUrl}
                      </a>
                    </div>
                    <div className="grid gap-2 text-sm md:min-w-72">
                      <StatusLine label="Subscription" value={formatStatus(subscription.status)} />
                      <StatusLine label="Page status" value={formatStatus(subscription.lifecycleStatus)} />
                      <StatusLine label="Renewal" value={subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Not recorded yet"} />
                      <StatusLine label="Cancel state" value={subscription.cancelAtPeriodEnd ? "Cancels at period end" : "Active renewal"} />
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

  return (
    <article id={`order-${reference}`} className="scroll-mt-28 rounded-md border border-line bg-white p-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs uppercase text-muted">{reference}</p>
            {order.createdAt ? <span className="text-sm text-muted">{new Date(order.createdAt).toLocaleDateString()}</span> : null}
          </div>
          <h3 className="mt-2 text-base font-medium text-ink">
            {order.itemCount} stand{order.itemCount === 1 ? "" : "s"} · {formatPrice(order.totalCents)}
          </h3>
          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 text-ink">{item.title}</td>
                    <td className="px-3 py-3 text-muted">{item.optionLabel}</td>
                    <td className="px-3 py-3 text-right text-muted">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-ink">{formatPrice(item.lineSubtotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {order.invoiceUrl ? <a href={order.invoiceUrl} target="_blank" rel="noreferrer" className="tr-button-ghost">View invoice</a> : <span className="rounded-md bg-soft px-3 py-2 text-sm text-muted">Invoice not recorded yet</span>}
            {order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="tr-button-ghost">View receipt</a> : null}
          </div>
        </div>
        <aside className="grid content-start gap-2 text-sm">
          <StatusLine label="Payment" value={formatPayment(order)} />
          <StatusLine label="Payment method" value={order.paymentMethodLabel} />
          <StatusLine label="Payment ref" value={order.paymentReference ?? "Not recorded yet"} />
          <StatusLine label="Subtotal" value={formatPrice(order.subtotalCents)} />
          <StatusLine label="Shipping" value={order.shippingAmountCents > 0 ? formatPrice(order.shippingAmountCents) : "Reviewed separately"} />
          <StatusLine label="Order total" value={formatPrice(order.totalCents)} />
          <StatusLine label="Production" value={formatStatus(order.productionStatus)} />
          <StatusLine label="Fulfillment" value={formatStatus(order.shippingStatus)} />
        </aside>
      </div>
    </article>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4 rounded-md bg-soft px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right capitalize text-ink">{value}</span>
    </p>
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
