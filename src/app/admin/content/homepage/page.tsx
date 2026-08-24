import { AdminShell } from "@/components/admin/admin-shell";
import { WebsiteEditor } from "@/components/admin/website-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { getFooterContent, getHeaderNavigationContent, getHomepageThemeContent } from "@/lib/website-content";

export default async function AdminHomepageEditorPage() {
  await requireAdmin();
  const [header, footer, homepage] = await Promise.all([getHeaderNavigationContent(), getFooterContent(), getHomepageThemeContent()]);

  return (
    <AdminShell>
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:py-12">
      <p className="text-sm font-semibold uppercase text-brand">Admin</p>
      <h1 className="mt-3 text-4xl font-black text-ink">Website editor</h1>
      <p className="mt-4 leading-7 text-muted">
        Control approved public website content without changing the Tap Rater design system, product model, checkout, subscriptions, or production workflow.
      </p>
      <div className="mt-8">
        <WebsiteEditor header={header} footer={footer} homepage={homepage} />
      </div>
    </section>
    </AdminShell>
  );
}
