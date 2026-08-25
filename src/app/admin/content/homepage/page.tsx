import { AdminShell } from "@/components/admin/admin-shell";
import { WebsiteEditor } from "@/components/admin/website-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminBusinessUses } from "@/lib/admin-business-uses";
import { getFooterContent, getHeaderNavigationContent, getHomepageThemeContent } from "@/lib/website-content";

export default async function AdminHomepageEditorPage() {
  await requireAdmin();
  const [header, footer, homepage, businessUses] = await Promise.all([getHeaderNavigationContent(), getFooterContent(), getHomepageThemeContent(), getAdminBusinessUses()]);

  return (
    <AdminShell>
      <section className="tr-admin-section">
      <p className="tr-eyebrow">Admin</p>
      <h1 className="tr-admin-title mt-3">Website editor</h1>
      <p className="mt-4 leading-7 text-muted">
        Control approved public website content without changing the Tap Rater design system, product model, checkout, subscriptions, or production workflow.
      </p>
      <div className="mt-8">
        <WebsiteEditor businessUses={businessUses} header={header} footer={footer} homepage={homepage} />
      </div>
      </section>
    </AdminShell>
  );
}
