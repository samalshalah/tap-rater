import { AdminShell } from "@/components/admin/admin-shell";
import { PageEditor } from "@/components/admin/page-editor";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminPagesEditorPage() {
  await requireAdmin();

  return (
    <AdminShell>
      <section className="tr-admin-section max-w-4xl">
      <p className="tr-eyebrow">Admin</p>
      <h1 className="tr-admin-title mt-3">Page editor</h1>
      <p className="mt-4 leading-7 text-muted">
        Create editable content records for future pages such as About, Shipping, Returns, Privacy, and custom SEO landing pages.
      </p>
      <div className="tr-admin-card mt-8 p-5 md:p-7">
        <PageEditor />
      </div>
      </section>
    </AdminShell>
  );
}
