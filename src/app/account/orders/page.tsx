import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";
import { formatPrice } from "@/lib/products";

export default async function AccountOrdersPage() {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);

  return (
    <AccountShell>
      <section className="tr-card p-6">
        <p className="tr-eyebrow">Orders</p>
        <h2 className="mt-2 text-xl font-medium text-ink">Order history</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Purchase records, totals, and fulfillment progress.</p>
        <div className="mt-6 grid gap-3">
          {portal.orders.length ? (
            portal.orders.map((order) => (
              <article key={order.id} className="rounded-md border border-line bg-white p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase text-muted">{formatOrderReference(order.reference)}</p>
                    <h3 className="mt-1 text-lg font-medium text-ink">{formatPrice(order.totalCents)}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {order.itemCount} stand{order.itemCount === 1 ? "" : "s"}
                      {order.createdAt ? ` · ${new Date(order.createdAt).toLocaleDateString()}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.items.slice(0, 4).map((item) => (
                        <span key={item.id} className="rounded-full bg-soft px-2.5 py-1 text-xs text-muted">
                          {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.title}
                        </span>
                      ))}
                      {order.items.length > 4 ? <span className="rounded-full bg-soft px-2.5 py-1 text-xs text-muted">+{order.items.length - 4} more</span> : null}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm md:min-w-64">
                    <StatusLine label="Payment" value={formatPayment(order)} />
                    <StatusLine label="Production" value={order.productionStatus.replaceAll("_", " ")} />
                    <StatusLine label="Shipping" value={order.shippingStatus.replaceAll("_", " ")} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState message="No submitted orders are linked to this account yet." />
          )}
        </div>
      </section>
    </AccountShell>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4 rounded-md bg-soft px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium capitalize text-ink">{value}</span>
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-soft p-5 text-sm text-muted">{message}</div>;
}

function formatPayment(order: { status: string; paymentStatus?: string }) {
  if (order.paymentStatus === "manual_unpaid") return "submitted - payment pending review";
  if (order.status === "paid" || order.paymentStatus === "paid") return "paid";
  return order.status.replaceAll("_", " ");
}
