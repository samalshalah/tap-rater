import { isEtsyOrder } from "@/lib/complimentary-order-types";
import { Plus } from "lucide-react";
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
import { listReviewsSubscriptions, type ReviewsSubscriptionRow } from "@/lib/reviews-subscription-admin";
import { marketingPlan } from "@/lib/marketing-plan";

type AdminOrdersPageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const { configured, orders } = await getAdminOrders();
  const workspaceOrders = orders.filter((order) => Boolean(order.id)).map(toWorkspaceOrder);
  // Google Reviews subscriptions are billed separately from stand orders; list them here so every sale is visible.
  const subscriptions = await listReviewsSubscriptions().catch(() => null);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Commerce</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="tr-admin-title">Orders</h1>
              <AdminLinkButton href="/admin/orders/new" variant="primary"><Plus size={14} aria-hidden="true" />Create complimentary order</AdminLinkButton>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Manage paid and complimentary orders from creation through production, tracking, shipment, delivery, and fulfillment notes.
            </p>
          </div>
          <div className="tr-admin-card px-4 py-3 text-sm font-semibold text-ink">
            {workspaceOrders.length} orders
            {params?.filter === "production" ? <span className="ml-2"><AdminBadge tone="warning">Production queue</AdminBadge></span> : null}
          </div>
        </div>

        <AdminOrdersWorkspace configured={configured} orders={workspaceOrders} initialFilter={params?.filter} />
      </section>
      <ReviewsSubscriptions rows={subscriptions} />
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
    isEtsy: isEtsyOrder(order),
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
  if (isEtsyOrder(order)) return "Etsy";
  if (order.payment_status === "complimentary") return "Complimentary — no payment due";
  if (order.payment_status === "manual_unpaid") return "Submitted - payment pending review";
  if (order.status === "paid" || order.payment_status === "paid") return "Paid";
  return "Unfinished checkout";
}

const subscriptionTone: Record<string, "success" | "warning" | "danger" | "neutral"> = { active: "success", trialing: "success", past_due: "warning", incomplete: "warning", unpaid: "danger", canceled: "neutral", cancelled: "neutral", incomplete_expired: "neutral" };

function ReviewsSubscriptions({ rows }: { rows: ReviewsSubscriptionRow[] | null }) {
  return (
    <section id="reviews-subscriptions" className="tr-admin-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Google Reviews subscriptions</h2>
          <p className="mt-1 text-sm text-muted">Monthly service subscriptions. They are not stand orders and need no fulfillment.</p>
        </div>
        {rows ? <div className="tr-admin-card px-4 py-3 text-sm font-semibold text-ink">{rows.length} subscriptions</div> : null}
      </div>
      {rows === null ? <p className="mt-4 text-sm text-muted">Subscriptions could not be loaded.</p>
        : rows.length === 0 ? <p className="mt-4 text-sm text-muted">No Google Reviews subscriptions yet.</p>
        : <div className="tr-admin-card mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="text-xs uppercase text-muted"><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Business</th><th className="px-4 py-3">Locations</th><th className="px-4 py-3">Monthly</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Renews / ends</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.stripe_subscription_id} className="border-t border-line align-top">
              <td className="px-4 py-3"><strong className="block text-ink">{row.name || row.email}</strong><span className="text-xs text-muted">{row.email}</span></td>
              <td className="px-4 py-3">{row.businesses || <span className="text-muted">Not set up yet</span>}</td>
              <td className="px-4 py-3">{row.locations}</td>
              <td className="px-4 py-3">{formatPrice(marketingPlan.monthlyCents * row.locations)}</td>
              <td className="px-4 py-3"><AdminBadge tone={subscriptionTone[row.status] ?? "neutral"}>{row.status.replaceAll("_", " ")}</AdminBadge>{row.stripe_mode === "test" ? <span className="ml-2"><AdminBadge>Test</AdminBadge></span> : null}{row.cancel_at_period_end ? <span className="mt-1 block text-xs text-muted">Renewal canceled</span> : null}</td>
              <td className="px-4 py-3">{row.current_period_end ? new Date(row.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>}
    </section>
  );
}
