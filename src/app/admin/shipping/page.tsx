import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminShell } from "@/components/admin/admin-shell";
import { ShippingSettingsForm } from "@/components/admin/shipping-settings-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getShippingSettings } from "@/lib/shipping-settings";

export default async function AdminShippingPage() {
  await requireAdmin();
  const settings = await getShippingSettings();

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <AdminPageHeader title="Shipping" description="How checkout collects shipping addresses and whether a shipping charge is added." />
        <div className="mt-8">
          <ShippingSettingsForm settings={settings} />
        </div>
      </section>
    </AdminShell>
  );
}
