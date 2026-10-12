import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert, AdminSummaryCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminNavigationGroups } from "@/lib/admin-navigation";
import { getAdminProducts } from "@/lib/admin-products";
import { canRunOrderProductionActions, isOrderPaymentConfirmed } from "@/lib/order-fulfillment-rules";
import { getAdminOrders, getOrderLineItemProductionSummary } from "@/lib/orders";

export default async function AdminPage() {
  await requireAdmin();
  const [{ configured, orders }, products] = await Promise.all([getAdminOrders(), getAdminProducts()]);
  const paidOrders = orders.filter((order) => isOrderPaymentConfirmed(order.status, order.payment_status));
  const productionEligible = paidOrders.filter(canRunOrderProductionActions);
  const productionOrders = productionEligible.filter(orderNeedsProductionAttention);
  const artworkFailures = productionEligible.filter((order) =>
    order.line_items_json.some((item) => getOrderLineItemProductionSummary(item).productionArtwork?.status === "generation_failed")
  );
  const readyToShip = productionEligible.filter((order) => order.production_status === "completed" && order.shipping_status === "ready_to_ship");
  const activeProducts = products.filter((product) => product.isActive);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Admin</p>
        <h1 className="tr-admin-title mt-1">Operations dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Review the orders, production work, fulfillment status, and sellable product readiness that staff need today.
        </p>
        {!configured ? (
          <AdminAlert className="mt-6" tone="warning">
            Order persistence is not configured. Order and production counts will stay empty until database configuration is available.
          </AdminAlert>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["Needs production", String(productionOrders.length), "Open production work", "/admin/orders?filter=production"],
            ["Artwork failures", String(artworkFailures.length), "Artwork needing attention", "/admin/orders?filter=artwork_failures"],
            ["Ready to ship", String(readyToShip.length), "Completed and awaiting shipment", "/admin/orders?filter=ready_to_ship"],
            ["Active products", String(activeProducts.length), "Visible in your storefront", "/admin/products"]
          ].map(([label, value, copy, href]) => (
            <AdminSummaryCard key={label} label={label} value={value} description={copy} href={href} />
          ))}
        </div>
        <h2 className="mt-6 mb-3 text-ink">Manage your store</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {adminNavigationGroups.flatMap((group) => group.items).filter((item) => item.href !== "/admin").map((item) => (
            <Link key={item.href} href={item.href} className="tr-admin-card tr-admin-card-link p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-ink">{item.label}</h3>
                <span aria-hidden="true" className="text-brand">&rarr;</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function orderNeedsProductionAttention(order: Awaited<ReturnType<typeof getAdminOrders>>["orders"][number]) {
  if (order.shipping_status === "shipped" || order.shipping_status === "delivered") return false;
  if (order.production_status !== "completed") return true;

  return order.line_items_json.some((item) => {
    const summary = getOrderLineItemProductionSummary(item);
    return summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed";
  });
}
