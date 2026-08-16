import { requireAdmin } from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";
import { hasSupabaseAdminConfig } from "@/lib/db";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await getAdminProducts();
  const canSave = hasSupabaseAdminConfig();

  return (
    <AdminShell>
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-12">
      <p className="text-sm font-semibold uppercase text-brand">Admin</p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-black text-ink">Products</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Create and manage product records, pricing, inventory status, visibility, and SEO.</p>
        </div>
        <Link href="/admin/products/new" className="rounded-md bg-brand px-5 py-3 text-sm font-bold text-white">
          Create product
        </Link>
      </div>
      {!canSave ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
          Database persistence is not configured yet. Product edits cannot be saved.
        </div>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total products" value={String(products.length)} />
        <SummaryCard label="Active" value={String(products.filter((product) => product.isActive).length)} />
        <SummaryCard label="Drafts" value={String(products.filter((product) => !product.isActive).length)} />
        <SummaryCard label="Out of stock" value={String(products.filter((product) => product.stockStatus === "outofstock").length)} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-md border border-line bg-white shadow-sm">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
              <th className="p-4">Image</th>
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4">Base price</th>
              <th className="p-4">Sale price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Visibility</th>
              <th className="p-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr className="border-b border-line last:border-b-0" key={product.slug}>
                <td className="p-4">
                  <ProductThumbnail product={product} />
                </td>
                <td className="p-4 font-bold text-ink">{product.title}</td>
                <td className="p-4 text-muted">{product.sku}</td>
                <td className="p-4 text-muted">{getCategoryBySlug(product.categorySlug)?.title ?? product.categorySlug}</td>
                <td className="p-4 text-muted">{formatPrice(product.basePriceCents)}</td>
                <td className="p-4 text-muted">{product.salePriceCents ? formatPrice(product.salePriceCents) : "-"}</td>
                <td className="p-4">
                  <span className={product.stockStatus === "instock" ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-muted"}>
                    {product.stockStatus === "instock" ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td className="p-4">
                  <span className={product.isActive ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-ink"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <Link className="font-bold text-brand" href={`/admin/products/${product.slug}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    </AdminShell>
  );
}

function ProductThumbnail({ product }: { product: Awaited<ReturnType<typeof getAdminProducts>>[number] }) {
  const image = product.images[0];
  const thumbnailSrc =
    image?.src === "/uploads/products/business-google-white-stand.jpg"
      ? "/uploads/products/business-google-white-stands-bundle.jpg"
      : image?.src;

  return thumbnailSrc ? (
    <img src={thumbnailSrc} alt={image?.alt || product.title} className="h-14 w-14 rounded-md border border-line bg-white object-contain" loading="lazy" />
  ) : (
    <div className="grid h-14 w-14 place-items-center rounded-md border border-dashed border-line bg-white text-[10px] font-bold uppercase text-muted">
      No image
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
