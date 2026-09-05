import { CreditCard } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal, type CustomerPortalInvoice, type CustomerPortalOrder } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";
import { formatPrice } from "@/lib/products";

export default async function AccountOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{ billing_error?: string }>;
}) {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);
  const pendingPayments = portal.orders.filter((order) => order.paymentStatus === "manual_unpaid");
  const params = await searchParams;
  const billingError = typeof params?.billing_error === "string" ? params.billing_error : "";

  return (
    <AccountShell>
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">Orders & Billing</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Orders, invoices, and payments</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Review invoice records, receipts, payment status, and recurring Multi-Link billing in one place.
          </p>
          {portal.subscriptions.length === 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action="/api/account/billing-portal" method="post">
                <button type="submit" className="tr-button-primary inline-flex items-center gap-2">
                  <CreditCard aria-hidden="true" className="h-4 w-4" />
                  Manage payment method
                </button>
              </form>
            </div>
          ) : null}
        </section>

        {billingError ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>{billingError}</p>
          </section>
        ) : null}

        {pendingPayments.length ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>Some payments are waiting for Tap Rater review.</p>
          </section>
        ) : null}

        <section className="tr-card p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="tr-eyebrow">Order history</p>
              <h2 className="mt-2 text-lg font-medium text-ink">Invoices and payment history</h2>
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
              <p className="tr-eyebrow">Invoices</p>
              <h2 className="mt-2 text-lg font-medium text-ink">Payment documents</h2>
            </div>
            <p className="text-sm text-muted">{portal.invoices.length} invoice{portal.invoices.length === 1 ? "" : "s"}</p>
          </div>
          <div className="mt-5 divide-y divide-line overflow-hidden rounded-md border border-line bg-white">
            {portal.invoices.length ? (
              portal.invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)
            ) : (
              <EmptyState message="Invoices will appear here after Stripe confirms payment." />
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
                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="flex flex-wrap gap-2 text-sm md:justify-end">
                        <StatusBadge label={formatStatus(subscription.status)} />
                        <StatusBadge label={formatStatus(subscription.lifecycleStatus)} />
                        <StatusBadge label={subscription.currentPeriodEnd ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : "Renewal not recorded"} />
                      </div>
                      {subscription.billingProfileAvailable ? (
                        <form action="/api/account/billing-portal" method="post">
                          <input type="hidden" name="subscription_id" value={subscription.id} />
                          <button type="submit" className="tr-button-ghost inline-flex items-center gap-2">
                            <CreditCard aria-hidden="true" className="h-4 w-4" />
                            Manage billing
                          </button>
                        </form>
                      ) : (
                        <StatusBadge label="Billing managed by Tap Rater" />
                      )}
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

function InvoiceCard({ invoice }: { invoice: CustomerPortalInvoice }) {
  return (
    <article className="grid gap-3 p-4 text-sm md:grid-cols-[minmax(0,1fr)_140px_180px] md:items-center">
      <div className="min-w-0">
        <h3 className="text-base font-medium text-ink">{invoice.invoiceNumber ?? "Stripe invoice"}</h3>
        <p className="mt-1 text-muted">
          {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "Date pending"} · {invoice.paymentMethodLabel}
        </p>
      </div>
      <div className="md:text-right">
        <p className="text-xs uppercase text-muted">Paid</p>
        <p className="mt-1 text-ink">{formatPrice(invoice.amountPaidCents || invoice.totalCents)}</p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {invoice.invoiceUrl ? <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="tr-button-ghost">Download PDF</a> : null}
        {invoice.receiptUrl ? <a href={invoice.receiptUrl} target="_blank" rel="noreferrer" className="tr-button-ghost">Receipt</a> : null}
        {!invoice.invoiceUrl && !invoice.receiptUrl ? <StatusBadge label={formatStatus(invoice.paymentStatus ?? invoice.status ?? "pending")} /> : null}
      </div>
    </article>
  );
}

function OrderCard({ order }: { order: CustomerPortalOrder }) {
  const reference = formatOrderReference(order.reference);

  return (
    <article id={`order-${reference}`} className="scroll-mt-28 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm uppercase text-ink">{reference}</h3>
            {order.createdAt ? <span className="text-sm text-muted">{new Date(order.createdAt).toLocaleDateString()}</span> : null}
            <StatusBadge label={formatPayment(order)} tone={order.paymentStatus === "manual_unpaid" ? "warning" : "neutral"} />
          </div>
          <div className="mt-3 grid gap-2">
            {order.items.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-md bg-soft px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_160px_56px_96px] md:items-center">
                <p className="text-ink">{item.title}</p>
                <p className="text-muted">{item.optionLabel}</p>
                <p className="text-muted md:text-center">Qty {item.quantity}</p>
                <p className="text-ink md:text-right">{formatPrice(item.lineSubtotalCents)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {order.invoiceNumber ? <span>Invoice: {order.invoiceNumber}</span> : null}
            <span>Payment method: {order.paymentMethodLabel}</span>
            {order.paymentReference ? <span>Reference: {order.paymentReference}</span> : null}
          </div>
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
