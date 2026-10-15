import { Gift, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOrdersWorkspace, type AdminOrdersWorkspaceOrder } from "@/components/admin/admin-orders-workspace";
import { AdminBadge, AdminLinkButton } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminOrders,
  getOrderLineItemProductionSummary,
  type OrderRecord
} from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type AdminOrdersPageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const { configured, orders } = await getAdminOrders();
  const workspaceOrders = orders.filter((order) => Boolean(order.id)).map(toWorkspaceOrder);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Commerce</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="tr-admin-title">Orders</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Manage paid and complimentary orders from creation through production, tracking, shipment, delivery, and fulfillment notes.
            </p>
          </div>
          <div className="tr-admin-card px-4 py-3 text-sm font-semibold text-ink">
            {workspaceOrders.length} orders
            {params?.filter === "production" ? <span className="ml-2"><AdminBadge tone="warning">Production queue</AdminBadge></span> : null}
          </div>
        </div>

        <div className="my-6 flex flex-col gap-4 rounded-xl border border-brand/30 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Gift className="mt-1 shrink-0 text-brand" size={24} aria-hidden="true" />
            <div><h2 className="font-semibold text-ink">Give a client a free stand</h2><p className="mt-1 text-sm text-muted">Create a $0 order using your existing stands. No payment required.</p></div>
          </div>
          <AdminLinkButton href="/admin/orders/new" variant="primary" className="min-h-12 w-full shrink-0 sm:w-auto"><Plus size={18} aria-hidden="true" />Create complimentary order</AdminLinkButton>
        </div>
        <AdminOrdersWorkspace configured={configured} orders={workspaceOrders} initialFilter={params?.filter} />
      </section>
    </AdminShell>
  );
}

function toWorkspaceOrder(order: OrderRecord): AdminOrdersWorkspaceOrder {
  const summaries = order.line_items_json.map(getOrderLineItemProductionSummary);
  const hasWarnings = summaries.some((summary) => summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed");
  const hasBranded = summaries.some((summary) => summary.fulfillmentKind === "branded");
  const hasStandard = summaries.some((summary) => summary.fulfillmentKind === "standard");
  const hasHosted = summaries.some((summary) => summary.fulfillmentKind === "hosted");

  return {
    id: order.id ?? "",
    shippedAt: order.shipped_at,
    hasArtworkFailure: summaries.some((summary) => summary.productionArtwork?.status === "generation_failed"),
    hasProductionWarnings: hasWarnings,
    checkoutSessionId: order.stripe_checkout_session_id,
    customerName: order.customer_name ?? "Customer",
    email: order.email ?? "",
    items: order.line_items_json.map((item, index) => {
      const summary = getOrderLineItemProductionSummary(item);
      return {
        key: `${item.productId}-${item.optionId ?? "base"}-${index}`,
        title: item.title,
        quantity: item.quantity,
        sku: item.sku,
        optionLabel: summary.optionLabel,
        statusLabel: summary.statusLabel,
        statusTone: summary.statusTone
      };
    }),
    total: formatPrice(order.total_cents),
    status: order.status,
    paymentStatus: order.payment_status ?? "",
    productionStatus: order.production_status,
    shippingStatus: order.shipping_status,
    shippingMethod: order.shipping_method ?? "",
    shippingCarrier: order.shipping_carrier ?? "",
    trackingNumber: order.tracking_number ?? "",
    trackingUrl: order.tracking_url ?? "",
    internalNotes: order.internal_notes,
    adminFulfillmentNotes: order.admin_fulfillment_notes,
    createdAt: order.created_at ? new Date(order.created_at).toLocaleString() : "-",
    fulfillmentBadges: [
      { label: formatPaymentBadge(order), tone: order.status === "paid" ? "ready" : "warning" },
      ...(hasStandard ? [{ label: "Standard Direct", tone: "neutral" as const }] : []),
      ...(hasBranded ? [{ label: hasWarnings ? "Needs production data" : "Branded + QR ready", tone: hasWarnings ? "warning" as const : "ready" as const }] : []),
      ...(hasHosted ? [{ label: "Hosted setup", tone: "warning" as const }] : []),
      ...(!hasWarnings && order.status === "paid" ? [{ label: "Production ready", tone: "ready" as const }] : [])
    ]
  };
}

function formatPaymentBadge(order: OrderRecord) {
  if (order.payment_status === "complimentary") return "Complimentary — no payment due";
  if (order.payment_status === "manual_unpaid") return "Submitted - payment pending review";
  if (order.status === "paid" || order.payment_status === "paid") return "Paid";
  return "Unfinished checkout";
}
