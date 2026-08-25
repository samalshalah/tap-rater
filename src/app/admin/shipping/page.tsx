import { AdminShell } from "@/components/admin/admin-shell";
import { ShippingSettingsForm } from "@/components/admin/shipping-settings-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getShippingSettings } from "@/lib/shipping-settings";

export default async function AdminShippingPage() {
  await requireAdmin();
  const settings = await getShippingSettings();

  return (
    <AdminShell>
      <section className="tr-admin-section max-w-5xl">
        <p className="tr-eyebrow">Commerce</p>
        <div className="mt-3">
          <h1 className="tr-admin-title">Shipping</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Configure how Stripe Checkout collects shipping addresses and whether Tap Rater adds a shipping charge.
          </p>
        </div>
        <div className="mt-8">
          <ShippingSettingsForm settings={settings} />
        </div>
      </section>
    </AdminShell>
  );
}
