import { AdminShell } from "@/components/admin/admin-shell";
import { EmailDeliveryHistory } from "@/components/admin/email-delivery-history";
import { EmailTemplatesForm } from "@/components/admin/email-templates-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminEmailDeliveries } from "@/lib/email-deliveries";
import { getAllEmailTemplates } from "@/lib/email-templates";

export default async function AdminEmailTemplatesPage() {
  await requireAdmin();
  const [templates, deliveryOverview] = await Promise.all([
    getAllEmailTemplates(),
    getAdminEmailDeliveries()
  ]);

  return (
    <AdminShell>
      <section className="tr-admin-section max-w-6xl">
        <p className="tr-eyebrow">Settings</p>
        <div className="mt-3">
          <h1 className="tr-admin-title">Email templates</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Manage safe email copy for operational notifications. Product, order, setup, shipping, and policy details are still generated from trusted order data.
          </p>
        </div>
        <div className="mt-8">
          <EmailTemplatesForm initialTemplates={templates} />
        </div>
        <div className="mt-12 border-t border-line pt-10">
          <p className="tr-eyebrow">Operations</p>
          <h2 className="tr-admin-title mt-3">Email delivery</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Monitor provider acceptance, delivery outcomes, and retryable order notifications.
          </p>
          <div className="mt-6">
            <EmailDeliveryHistory overview={deliveryOverview} />
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
