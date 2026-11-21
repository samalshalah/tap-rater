import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";
import { hasSupabaseAdminConfig } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProductCsvActions } from "@/components/admin/admin-product-csv-actions";
import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { AdminAlert, AdminSummaryCard } from "@/components/admin/admin-ui";
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
        <AdminPageHeader title="Products" description="Sellable stands, prices, Standard and Branded availability, and production readiness." actions={<AdminProductCsvActions canImportExport={canSave} />} />
        {!canSave ? (
          <AdminAlert className="mt-6" tone="warning">
            Database persistence is not configured yet. Product edits cannot be saved.
          </AdminAlert>
        ) : null}
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <AdminSummaryCard label="Total products" value={String(products.length)} />
          <AdminSummaryCard label="Active" value={String(products.filter((product) => product.isActive).length)} />
          <AdminSummaryCard label="Branded template ready" value={String(products.filter((product) => Boolean(product.assetSet?.brandedFrontTemplateUrl)).length)} />
          <AdminSummaryCard label="Needs review" value={String(products.filter((product) => !product.isActive || product.stockStatus === "outofstock").length)} />
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
