import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductEditor } from "@/components/admin/product-editor";
import { createBlankAdminProduct, getAdminProductBySlug } from "@/lib/admin-products";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabaseAdminConfig } from "@/lib/db";
import {
  getBusinessUses,
  getPlatforms,
  getProductOptions,
  getProductOptionTemplates,
  getStandTypes
} from "@/lib/catalog-architecture-repository";

type AdminProductEditorPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminProductEditorPage({ params }: AdminProductEditorPageProps) {
  await requireAdmin();
  const { slug } = await params;
  const isCreate = slug === "new";
  const product = isCreate ? createBlankAdminProduct() : await getAdminProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [standTypes, businessUses, platforms, optionTemplates, productOptions] = await Promise.all([
    getStandTypes(),
    getBusinessUses(),
    getPlatforms(),
    getProductOptionTemplates(),
    isCreate ? Promise.resolve([]) : getProductOptions(product.slug)
  ]);
  const canSave = hasSupabaseAdminConfig();

  return (
    <AdminShell>
    <section className="mx-auto max-w-7xl px-4 py-6 md:px-8 lg:py-8">
      <p className="text-sm font-semibold uppercase text-brand">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-ink">{isCreate ? "Add product" : product.title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        Manage one canonical stand product, its allowed setup options, required assets, destination metadata, and storefront publishing status.
      </p>
      {!canSave ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
          Database persistence is not configured yet. Product edits cannot be saved.
        </div>
      ) : null}
      <ProductEditor
        product={product}
        standTypes={standTypes}
        businessUses={businessUses}
        platforms={platforms}
        optionTemplates={optionTemplates}
        productOptions={productOptions}
        mode={isCreate ? "create" : "edit"}
      />
    </section>
    </AdminShell>
  );
}
