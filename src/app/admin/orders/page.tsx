import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminOrders, getOrderLineItemFulfillmentKind, type OrderLineItem } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const { configured, orders } = await getAdminOrders();

  return (
    <AdminShell>
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-12">
        <p className="text-sm font-black uppercase text-brand">Commerce</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black text-ink">Orders</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Stripe checkout creates pending orders, and the Stripe webhook marks them paid after checkout completes.
            </p>
          </div>
          <div className="rounded-md border border-line bg-white px-4 py-3 text-sm font-bold text-ink">
            {orders.length} orders
          </div>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
            Database persistence is not configured yet. Stripe checkout stays disabled until orders can be persisted.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total orders" value={String(orders.length)} />
          <SummaryCard label="Paid" value={String(orders.filter((order) => order.status === "paid").length)} />
          <SummaryCard label="Pending" value={String(orders.filter((order) => order.status === "pending_payment").length)} />
          <SummaryCard label="Revenue" value={formatPrice(orders.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.total_cents, 0))} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-md border border-line bg-white shadow-sm">
          <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
                <th className="p-4">Stripe session</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.stripe_checkout_session_id} className="border-b border-line last:border-b-0">
                  <td className="p-4 font-mono text-xs text-ink">{order.stripe_checkout_session_id}</td>
                  <td className="p-4">
                    <p className="font-bold text-ink">{order.customer_name ?? "Customer"}</p>
                    <p className="text-muted">{order.email ?? "-"}</p>
                  </td>
                  <td className="p-4 text-muted">
                    {order.line_items_json.length > 0
                      ? order.line_items_json.map((item) => (
                          <OrderLineItemSummary key={`${item.productId}-${item.optionId ?? "base"}`} item={item} />
                        ))
                      : "-"}
                  </td>
                  <td className="p-4 font-black text-ink">{formatPrice(order.total_cents)}</td>
                  <td className="p-4">
                    <span className={order.status === "paid" ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-ink"}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 text-muted">{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {orders.length === 0 ? (
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

function formatProductionStatus(status: string | undefined) {
  if (status === "ready_for_direct_activation") return "Ready for direct activation";
  if (status === "pending_branded_proof_review") return "Pending branded proof review";
  if (status === "pending_manual_logo_and_proof") return "Pending manual logo collection and proof approval";
  if (status === "pending_manual_design_and_proof") return "Pending manual design collection and proof approval";
  return "Pending review";
}

function OrderLineItemSummary({ item }: { item: OrderLineItem }) {
  const fulfillmentKind = getOrderLineItemFulfillmentKind(item);
  const isManualProduction = fulfillmentKind === "branded" || fulfillmentKind === "custom" || item.manualProductionRequired === true;
  const requirementLabel = fulfillmentKind === "custom" ? "Logo/design required" : "Logo required";
  const requirementValue = formatManualRequirement(item, fulfillmentKind);

  return (
    <div className="mb-3 last:mb-0">
      <p className="font-semibold text-ink">{item.quantity} x {item.title}</p>
      {item.optionLabel ? <p>{item.optionLabel}</p> : null}
      {item.setup && typeof item.setup.destinationUrl === "string" ? <p>Link: {item.setup.destinationUrl}</p> : null}
      {item.setup && typeof item.setup.businessName === "string" ? <p>Business: {item.setup.businessName}</p> : null}
      {item.setup && typeof item.setup.headline === "string" ? <p>Headline: {item.setup.headline}</p> : null}
      {item.setup && typeof item.setup.designNotes === "string" ? <p>Design notes: {item.setup.designNotes}</p> : null}
      <div className="mt-2 rounded-md border border-line bg-gray-50 p-2 text-xs leading-5 text-ink">
        <p><strong>{requirementLabel}:</strong> {requirementValue}</p>
        <p><strong>Logo reference:</strong> {item.logoReference ? String(item.logoReference) : item.logoRequired ? "Missing" : "Not required"}</p>
        <p><strong>Proof required:</strong> {item.proofRequired ? "Yes" : "No"}</p>
        <p><strong>Proof approved:</strong> {item.proofApproved ? "Yes" : "No"}</p>
        <p><strong>Production:</strong> {formatProductionStatus(item.productionStatus)}</p>
        {isManualProduction ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
            <p className="font-black">Manual production review required</p>
            <p>{formatManualProductionWarning(fulfillmentKind)}</p>
            {item.productionWarningCodes?.length ? (
              <p className="mt-1 font-mono text-[11px]">{item.productionWarningCodes.join(", ")}</p>
            ) : null}
          </div>
        ) : null}
        {item.logoRequired || item.proofRequired || isManualProduction ? (
          <p className="mt-1 font-black text-amber-700">Do not print until logo/design is collected and proof is approved.</p>
        ) : null}
      </div>
    </div>
  );
}

function formatManualRequirement(item: OrderLineItem, fulfillmentKind: ReturnType<typeof getOrderLineItemFulfillmentKind>) {
  if (fulfillmentKind === "custom") return "Manual design collection required";
  if (fulfillmentKind === "branded") return item.logoReference ? "Logo uploaded; proof review required" : "Manual logo collection required";
  return item.logoRequired ? "Yes" : "No";
}

function formatManualProductionWarning(fulfillmentKind: ReturnType<typeof getOrderLineItemFulfillmentKind>) {
  if (fulfillmentKind === "custom") {
    return "Collect/confirm custom design details before printing. Do not print until proof is approved.";
  }

  return "Collect/confirm logo and business details before printing. Do not print until proof is approved.";
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
