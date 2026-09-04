import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge, AdminCard, AdminLinkButton, AdminSummaryCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { calculateLaunchReadinessPercent, getLaunchReadinessChecks } from "@/lib/launch-readiness";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const checks = getLaunchReadinessChecks();
  const readinessPercent = calculateLaunchReadinessPercent(checks);
  const blocked = checks.filter((check) => check.status === "blocked").length;
  const warnings = checks.filter((check) => check.status === "warning").length;

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">System</p>
            <h1 className="tr-admin-title mt-2">Settings and launch readiness</h1>
            <p className="tr-body mt-3 max-w-3xl">Review production integrations without exposing credentials, then open the relevant operational settings.</p>
          </div>
          <AdminLinkButton href="/admin/settings/emails" variant="secondary">Email templates</AdminLinkButton>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <AdminSummaryCard label="Environment readiness" value={`${readinessPercent}%`} description="Configuration checks only; live purchase proof is separate." />
          <AdminSummaryCard label="Blocked checks" value={String(blocked)} description="Must be resolved before accepting payment." />
          <AdminSummaryCard label="Manual confirmations" value={String(warnings)} description="Dashboard, tax, or operational review required." />
        </div>

        <AdminCard title="Integration status" description="Only configuration presence and mode are shown. Secret values are never displayed." className="mt-5">
          <div className="divide-y divide-line">
            {checks.map((check) => (
              <div key={check.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-ink">{check.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{check.detail}</p>
                </div>
                <AdminBadge tone={check.status === "ready" ? "success" : check.status === "blocked" ? "danger" : "warning"}>
                  {check.status}
                </AdminBadge>
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCard title="Shipping"><AdminLinkButton href="/admin/shipping" variant="outline">Open shipping</AdminLinkButton></AdminCard>
          <AdminCard title="Taxes"><AdminLinkButton href="/admin/taxes" variant="outline">Open taxes</AdminLinkButton></AdminCard>
          <AdminCard title="Products"><AdminLinkButton href="/admin/products" variant="outline">Open products</AdminLinkButton></AdminCard>
          <AdminCard title="Website"><AdminLinkButton href="/admin/content" variant="outline">Open website</AdminLinkButton></AdminCard>
        </div>
      </section>
    </AdminShell>
  );
}
