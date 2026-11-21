import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminShell } from "@/components/admin/admin-shell";
import { TaxSettingsForm } from "@/components/admin/tax-settings-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getTaxSettings } from "@/lib/tax-settings";

export default async function AdminTaxesPage() {
  await requireAdmin();
  const settings = await getTaxSettings();

  return (
    <AdminShell>
      <section className="tr-admin-section grid gap-4">
        <AdminPageHeader title="Taxes" description="The tax estimate customers see before payment, passed to Stripe as a line item." />
        <TaxSettingsForm settings={settings} />
      </section>
    </AdminShell>
  );
}
