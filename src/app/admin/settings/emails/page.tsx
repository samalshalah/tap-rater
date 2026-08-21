import { AdminShell } from "@/components/admin/admin-shell";
import { EmailTemplatesForm } from "@/components/admin/email-templates-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllEmailTemplates } from "@/lib/email-templates";

export default async function AdminEmailTemplatesPage() {
  await requireAdmin();
  const templates = await getAllEmailTemplates();

  return (
    <AdminShell>
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:py-12">
        <p className="text-sm font-black uppercase text-brand">Settings</p>
        <div className="mt-3">
          <h1 className="text-4xl font-black text-ink">Email templates</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Manage safe email copy for operational notifications. Product, order, setup, shipping, and policy details are still generated from trusted order data.
          </p>
        </div>
        <div className="mt-8">
          <EmailTemplatesForm initialTemplates={templates} />
        </div>
      </section>
    </AdminShell>
  );
}
