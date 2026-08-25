import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { StandTypeEditor } from "@/components/admin/stand-type-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminStandTypeBySlug } from "@/lib/admin-stand-types";

type AdminStandTypePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminStandTypePage({ params }: AdminStandTypePageProps) {
  await requireAdmin();
  const { slug } = await params;
  const standType = await getAdminStandTypeBySlug(slug);

  if (!standType) {
    notFound();
  }

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Catalog</p>
        <h1 className="tr-admin-title mt-2">{standType.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Edit category content, buyer intent, SEO, image fields, visibility, and display order.</p>
        <StandTypeEditor standType={standType} mode="edit" />
      </section>
    </AdminShell>
  );
}
