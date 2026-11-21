import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
        <AdminPageHeader title="Inventory" description="Checkout accepts only active products marked in stock. Change availability below." actions={<AdminLinkButton href="/admin/products" variant="secondary">Manage products</AdminLinkButton>} />

        <InventoryAvailability initialRows={inventoryRows} />
      </section>
    </AdminShell>
  );
}
