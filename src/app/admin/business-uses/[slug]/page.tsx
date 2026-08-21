import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { BusinessUseEditor } from "@/components/admin/business-use-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminBusinessUseBySlug } from "@/lib/admin-business-uses";
import { getAdminProducts } from "@/lib/admin-products";

type AdminBusinessUsePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminBusinessUsePage({ params }: AdminBusinessUsePageProps) {
  await requireAdmin();
  const { slug } = await params;
  const [businessUse, products] = await Promise.all([getAdminBusinessUseBySlug(slug), getAdminProducts()]);

  if (!businessUse) {
    notFound();
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-12">
        <p className="text-sm font-semibold uppercase text-brand">Catalog</p>
        <h1 className="mt-2 text-4xl font-black text-ink">{businessUse.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Edit content, SEO, image fields, visibility, display order, and assigned products.</p>
        <BusinessUseEditor businessUse={businessUse} products={products} mode="edit" />
      </section>
    </AdminShell>
  );
}
