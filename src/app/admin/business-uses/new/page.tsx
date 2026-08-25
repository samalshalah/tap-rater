import { AdminShell } from "@/components/admin/admin-shell";
import { BusinessUseEditor } from "@/components/admin/business-use-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { createBlankBusinessUse } from "@/lib/admin-business-uses";
import { getAdminProducts } from "@/lib/admin-products";

export default async function NewBusinessUsePage() {
  await requireAdmin();
  const products = await getAdminProducts();

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Catalog</p>
        <h1 className="tr-admin-title mt-2">Create business use</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Create a backend-controlled Shop by Use card and optional landing page.</p>
        <BusinessUseEditor businessUse={createBlankBusinessUse()} products={products} mode="create" />
      </section>
    </AdminShell>
  );
}
