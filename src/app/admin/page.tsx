import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
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
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-12">
        <p className="tr-eyebrow">Admin</p>
        <h1 className="mt-3 text-4xl font-black text-ink">Operations dashboard</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted">
          Review the orders, production work, fulfillment status, and sellable product readiness that staff need today.
        </p>
        {!configured ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
            Order persistence is not configured. Order and production counts will stay empty until database configuration is available.
          </div>
        ) : null}
        <div className="mt-8 grid gap-5 lg:grid-cols-4">
          {[
            ["Needs production", String(productionOrders.length), "Paid orders with production work, artwork issues, or open fulfillment"],
            ["Artwork failures", String(artworkFailures.length), "Orders blocked by production artwork generation"],
            ["Ready to ship", String(readyToShip.length), "Produced orders awaiting shipment handling"],
            ["Active products", String(activeProducts.length), "Sellable products currently visible to customers"]
          ].map(([label, value, copy]) => (
            <article key={label} className="rounded-md border border-line bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-muted">{label}</p>
              <p className="mt-2 text-3xl font-black text-ink">{value}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminNavigationGroups.flatMap((group) => group.items).map((item) => (
            <Link key={item.href} className="rounded-md border border-line bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" href={item.href}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-black text-ink">{item.label}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
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
