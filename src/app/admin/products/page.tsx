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
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Commerce</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="tr-admin-title">Products</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Manage sellable products, DIRECT/HOSTED mode, Standard/Branded availability, pricing, and production template readiness.
            </p>
          </div>
          <Link href="/admin/products/new" className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white">
            Create product
          </Link>
        </div>
        {!canSave ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
            Database persistence is not configured yet. Product edits cannot be saved.
          </div>
        ) : null}
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total products" value={String(products.length)} />
          <SummaryCard label="Active" value={String(products.filter((product) => product.isActive).length)} />
          <SummaryCard label="Branded template ready" value={String(products.filter((product) => Boolean(product.assetSet?.brandedFrontTemplateUrl)).length)} />
          <SummaryCard label="Needs review" value={String(products.filter((product) => !product.isActive || product.stockStatus === "outofstock").length)} />
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
    <div className="tr-admin-card p-4">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
