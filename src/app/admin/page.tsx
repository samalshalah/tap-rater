import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert, AdminCard, AdminSummaryCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminNavigationGroups } from "@/lib/admin-navigation";
import { getAdminProducts } from "@/lib/admin-products";
import { getAdminOrders, getOrderLineItemProductionSummary } from "@/lib/orders";

export default async function AdminPage() {
  await requireAdmin();
  const [{ configured, orders }, products] = await Promise.all([getAdminOrders(), getAdminProducts()]);
  const paidOrders = orders.filter((order) => order.status === "paid");
  const productionOrders = orders.filter(orderNeedsProductionAttention);
  const artworkFailures = orders.filter((order) =>
    order.line_items_json.some((item) => getOrderLineItemProductionSummary(item).productionArtwork?.status === "generation_failed")
  );
  const readyToShip = orders.filter((order) => order.production_status === "completed" && order.shipping_status === "ready_to_ship");
  const activeProducts = products.filter((product) => product.isActive);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Admin</p>
        <h1 className="tr-admin-title mt-3">Operations dashboard</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted">
          Review the orders, production work, fulfillment status, and sellable product readiness that staff need today.
        </p>
        {!configured ? (
          <AdminAlert className="mt-6" tone="warning">
            Order persistence is not configured. Order and production counts will stay empty until database configuration is available.
          </AdminAlert>
        ) : null}
        <div className="mt-8 grid gap-5 lg:grid-cols-4">
          {[
            ["Needs production", String(productionOrders.length), "Paid orders with production work, artwork issues, or open fulfillment"],
            ["Artwork failures", String(artworkFailures.length), "Orders blocked by production artwork generation"],
            ["Ready to ship", String(readyToShip.length), "Produced orders awaiting shipment handling"],
            ["Active products", String(activeProducts.length), "Sellable products currently visible to customers"]
          ].map(([label, value, copy]) => (
            <AdminSummaryCard key={label} label={label} value={value} description={copy} />
          ))}
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminNavigationGroups.flatMap((group) => group.items).map((item) => (
            <Link key={item.href} href={item.href}>
              <AdminCard className="h-full transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-ink">{item.label}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </AdminCard>
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
