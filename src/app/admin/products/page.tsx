import { requireAdmin } from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";
import { hasSupabaseAdminConfig } from "@/lib/db";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { getBusinessUses, getPlatforms, getStandTypes } from "@/lib/catalog-architecture-repository";

export default async function AdminProductsPage() {
  await requireAdmin();
  const [products, standTypes, businessUses, platforms] = await Promise.all([
    getAdminProducts(),
    getStandTypes(),
    getBusinessUses(),
    getPlatforms()
  ]);
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
      <AdminProductsTable
        products={products}
        standTypes={standTypes}
        businessUses={businessUses}
        platforms={platforms}
        canDelete={canSave}
      />
    </section>
    </AdminShell>
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
