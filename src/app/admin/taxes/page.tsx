import { AdminShell } from "@/components/admin/admin-shell";
import { TaxSettingsForm } from "@/components/admin/tax-settings-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getTaxSettings } from "@/lib/tax-settings";

export default async function AdminTaxesPage() {
  await requireAdmin();
  const settings = await getTaxSettings();

  return (
    <AdminShell>
      <div className="grid gap-6">
        <header>
          <p className="tr-eyebrow">Commerce</p>
          <h1 className="mt-2 text-3xl font-medium text-ink">Taxes</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Control the manual tax estimate customers see before payment. For now this is set to 6% and passed to Stripe as a normal line item.
          </p>
        </header>
        <TaxSettingsForm settings={settings} />
      </div>
    </AdminShell>
  );
}
