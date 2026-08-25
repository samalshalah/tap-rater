import { AdminShell } from "@/components/admin/admin-shell";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminOrders,
  getOrderLineItemProductionSummary,
  type OrderLineItem,
  type OrderRecord
} from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type AdminOrdersPageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdmin();
  const { configured, orders } = await getAdminOrders();
  const params = await searchParams;
  const activeFilter = params?.filter ?? "all";
  const filteredOrders = filterOrders(orders, activeFilter);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Commerce</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="tr-admin-title">Orders</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Stripe checkout creates pending orders, and the Stripe webhook marks them paid after checkout completes.
            </p>
          </div>
          <div className="rounded-md border border-line bg-white px-4 py-3 text-sm font-bold text-ink">
            {filteredOrders.length} orders
          </div>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
            Database persistence is not configured yet. Stripe checkout stays disabled until orders can be persisted.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total orders" value={String(orders.length)} />
          <SummaryCard label="Needs production" value={String(orders.filter(orderNeedsProductionAttention).length)} />
          <SummaryCard label="Artwork failed" value={String(orders.filter(orderHasArtworkFailure).length)} />
          <SummaryCard label="Ready to ship" value={String(orders.filter(orderReadyToShip).length)} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["paid", "Paid"],
            ["pending", "Pending"],
            ["production", "Needs production"],
            ["artwork_failed", "Artwork failed"],
            ["ready_to_ship", "Ready to ship"],
            ["shipped", "Shipped"]
          ].map(([value, label]) => (
            <Link
              key={value}
              href={value === "all" ? "/admin/orders" : `/admin/orders?filter=${value}`}
              className={activeFilter === value ? "rounded-full bg-ink px-4 py-2 text-xs font-black uppercase text-white" : "rounded-full border border-line bg-white px-4 py-2 text-xs font-black uppercase text-ink"}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="tr-admin-table-shell mt-6 overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.stripe_checkout_session_id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-4 align-top">
                    <p className="max-w-[210px] truncate font-mono text-xs text-ink" title={order.stripe_checkout_session_id}>
                      {order.stripe_checkout_session_id}
                    </p>
                    {order.id ? (
                      <Link href={`/admin/orders/${order.id}`} className="mt-2 inline-flex rounded-md border border-line px-3 py-1 text-xs font-semibold text-ink">
                        View order
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-ink">{order.customer_name ?? "Customer"}</p>
                    <p className="max-w-[220px] truncate text-muted" title={order.email ?? undefined}>{order.email ?? "-"}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-muted">
                    {order.line_items_json.length > 0
                      ? order.line_items_json.map((item) => (
                          <OrderLineItemSummary key={`${item.productId}-${item.optionId ?? "base"}`} item={item} />
                        ))
                      : "-"}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <OrderFulfillmentBadges order={order} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill tone={order.production_status === "completed" ? "ready" : "neutral"}>{formatStatus(order.production_status)}</StatusPill>
                      <StatusPill tone={order.shipping_status === "shipped" || order.shipping_status === "delivered" ? "ready" : "neutral"}>{formatStatus(order.shipping_status)}</StatusPill>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top font-semibold text-ink">
                    {formatPrice(order.total_cents)}
                    <div className="mt-2">
                      <StatusPill tone={order.status === "paid" ? "ready" : "warning"}>{order.status.replace("_", " ")}</StatusPill>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-muted">{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No Stripe orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function filterOrders(orders: OrderRecord[], filter: string) {
  if (filter === "paid") return orders.filter((order) => order.status === "paid");
  if (filter === "pending") return orders.filter((order) => order.status === "pending_payment");
  if (filter === "production") return orders.filter(orderNeedsProductionAttention);
  if (filter === "artwork_failed") return orders.filter(orderHasArtworkFailure);
  if (filter === "ready_to_ship") return orders.filter(orderReadyToShip);
  if (filter === "shipped") return orders.filter((order) => order.shipping_status === "shipped" || order.shipping_status === "delivered");
  return orders;
}

function orderNeedsProductionAttention(order: OrderRecord) {
  if (order.shipping_status === "shipped" || order.shipping_status === "delivered") return false;
  if (order.production_status !== "completed") return true;

  return order.line_items_json.some((item) => {
    const summary = getOrderLineItemProductionSummary(item);
    return summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed";
  });
}

function orderHasArtworkFailure(order: OrderRecord) {
  return order.line_items_json.some((item) => getOrderLineItemProductionSummary(item).productionArtwork?.status === "generation_failed");
}

function orderReadyToShip(order: OrderRecord) {
  return order.production_status === "completed" && order.shipping_status === "ready_to_ship";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function OrderLineItemSummary({ item }: { item: OrderLineItem }) {
  const summary = getOrderLineItemProductionSummary(item);
  const hasWarnings = summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed";

  return (
    <div className="mb-2 last:mb-0">
      <p className="font-semibold text-ink">{item.quantity} x {item.title}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <StatusPill tone="neutral">{summary.optionLabel}</StatusPill>
        <StatusPill tone={summary.fulfillmentKind === "standard" ? "ready" : hasWarnings ? "warning" : "ready"}>
          {summary.statusLabel}
        </StatusPill>
      </div>
      <p className="mt-1 font-mono text-[11px] uppercase text-muted">SKU {item.sku}</p>
    </div>
  );
}

function OrderFulfillmentBadges({ order }: { order: OrderRecord }) {
  const summaries = order.line_items_json.map(getOrderLineItemProductionSummary);
  const hasWarnings = summaries.some((summary) => summary.warnings.length > 0);
  const hasBranded = summaries.some((summary) => summary.fulfillmentKind === "branded");
  const hasStandard = summaries.some((summary) => summary.fulfillmentKind === "standard");
  const hasHosted = summaries.some((summary) => summary.fulfillmentKind === "hosted");

  return (
    <div className="flex max-w-xs flex-wrap gap-2">
      <StatusPill tone={order.status === "paid" ? "ready" : "warning"}>
        {order.status === "paid" ? "Paid" : "Payment pending"}
      </StatusPill>
      {hasStandard ? <StatusPill tone="neutral">Standard Direct</StatusPill> : null}
      {hasBranded ? (
        <StatusPill tone={hasWarnings ? "warning" : "ready"}>
          {hasWarnings ? "Needs production data" : "Branded + QR - artwork ready"}
        </StatusPill>
      ) : null}
      {hasHosted ? <StatusPill tone="warning">Hosted setup pending</StatusPill> : null}
      {!hasWarnings && order.status === "paid" ? <StatusPill tone="ready">Production ready</StatusPill> : null}
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "ready" | "warning" | "neutral" }) {
  const className =
    tone === "ready"
      ? "bg-teal-50 text-brand"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800"
        : "bg-gray-100 text-muted";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${className}`}>{children}</span>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
