import { AdminShell } from "@/components/admin/admin-shell";
import { AdminLinkButton } from "@/components/admin/admin-ui";
import { InventoryAvailability } from "@/components/admin/inventory-availability";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";

export default async function AdminInventoryPage() {
  await requireAdmin();
  const products = await getAdminProducts();
  const activeProducts = products.filter((product) => product.isActive && product.status !== "archived");
  const inventoryRows = activeProducts.map((product) => ({
    slug: product.slug,
    title: product.title,
    sku: product.sku,
    category: product.categorySlug,
    stockStatus: product.stockStatus
  }));

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">Commerce</p>
            <h1 className="tr-admin-title mt-2">Inventory availability</h1>
            <p className="tr-body mt-3 max-w-3xl">Checkout accepts only active products marked in stock. Change availability directly below.</p>
          </div>
          <AdminLinkButton href="/admin/products" variant="secondary">Manage products</AdminLinkButton>
        </div>

        <InventoryAvailability initialRows={inventoryRows} />
      </section>
    </AdminShell>
  );
}
