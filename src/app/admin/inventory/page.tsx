import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge, AdminCard, AdminLinkButton, AdminSummaryCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";

export default async function AdminInventoryPage() {
  await requireAdmin();
  const products = await getAdminProducts();
  const activeProducts = products.filter((product) => product.isActive && product.status !== "archived");
  const unavailableProducts = activeProducts.filter((product) => product.stockStatus === "outofstock");

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">Commerce</p>
            <h1 className="tr-admin-title mt-2">Inventory availability</h1>
            <p className="tr-body mt-3 max-w-3xl">Checkout accepts only active products marked in stock. Edit a product to change its availability.</p>
          </div>
          <AdminLinkButton href="/admin/products" variant="secondary">Manage products</AdminLinkButton>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <AdminSummaryCard label="Active products" value={String(activeProducts.length)} />
          <AdminSummaryCard label="Available" value={String(activeProducts.length - unavailableProducts.length)} />
          <AdminSummaryCard label="Out of stock" value={String(unavailableProducts.length)} />
        </div>

        <AdminCard title="Product availability" description="Inventory is currently controlled as available or out of stock because stands are produced to order." className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase text-muted">
                  <th className="pb-3 pr-4 font-semibold">Product</th>
                  <th className="pb-3 pr-4 font-semibold">SKU</th>
                  <th className="pb-3 pr-4 font-semibold">Category</th>
                  <th className="pb-3 pr-4 font-semibold">Availability</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activeProducts.map((product) => (
                  <tr key={product.slug}>
                    <td className="py-3 pr-4 font-medium text-ink">{product.title}</td>
                    <td className="py-3 pr-4 text-muted">{product.sku}</td>
                    <td className="py-3 pr-4 text-muted">{product.categorySlug.replaceAll("-", " ")}</td>
                    <td className="py-3 pr-4">
                      <AdminBadge tone={product.stockStatus === "instock" ? "success" : "danger"}>
                        {product.stockStatus === "instock" ? "In stock" : "Out of stock"}
                      </AdminBadge>
                    </td>
                    <td className="py-3 text-right"><AdminLinkButton href={`/admin/products/${product.slug}`} variant="ghost">Edit</AdminLinkButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </section>
    </AdminShell>
  );
}
