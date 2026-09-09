import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge, AdminCard, AdminLinkButton, AdminSummaryCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { launchOwnerRecord } from "@/data/launch-owner-record";
import { calculateLaunchReadinessPercent, getLaunchReadinessChecks, getStripeModeSummary } from "@/lib/launch-readiness";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const checks = getLaunchReadinessChecks();
  const readinessPercent = calculateLaunchReadinessPercent(checks);
  const blocked = checks.filter((check) => check.status === "blocked").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  const stripeMode = getStripeModeSummary();

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">System</p>
            <h1 className="tr-admin-title mt-2">Settings and configuration</h1>
            <p className="tr-body mt-3 max-w-3xl">{process.env.NODE_ENV === "development" ? "Local development environment. " : ""}Current server configuration only, not overall project completion or live-launch approval.</p>
          </div>
          <AdminLinkButton href="/admin/settings/emails" variant="secondary">Email templates</AdminLinkButton>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <AdminSummaryCard label="Configuration coverage" value={`${readinessPercent}%`} description="Ready = 1 point; warning = half; blocked = 0. Valid TEST keys count as configured." />
          <AdminSummaryCard label="Blocked checks" value={String(blocked)} description="Required integration configuration is missing or invalid." />
          <AdminSummaryCard label="Configuration warnings" value={String(warnings)} description="Optional integrations or recorded Dashboard configuration need attention." />
        </div>

        <section aria-labelledby="activation-heading" className="mt-8 border-t border-line pt-5">
          <h2 id="activation-heading" className="tr-admin-card-title text-ink">Live activation</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <p className="text-sm font-semibold text-ink">Payment environment</p>
              <p className="mt-1 text-sm leading-6 text-muted">{stripeMode.detail}</p>
            </div>
            <div><AdminBadge tone={stripeMode.status === "blocked" ? "danger" : stripeMode.status === "warning" ? "warning" : "neutral"}>{stripeMode.label}</AdminBadge></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <p className="text-sm font-semibold text-ink">Recorded owner direction</p>
              <p className="mt-1 text-sm leading-6 text-muted">{launchOwnerRecord.activation.detail}</p>
              <p className="mt-1 text-xs text-muted"><time dateTime={launchOwnerRecord.recordedOn}>{launchOwnerRecord.displayDate}</time></p>
            </div>
            <div><AdminBadge tone="warning">{launchOwnerRecord.activation.label}</AdminBadge></div>
          </div>
        </section>

        <section aria-labelledby="owner-confirmations-heading" className="mt-8 border-t border-line pt-5">
          <h2 id="owner-confirmations-heading" className="tr-admin-card-title text-ink">Owner confirmations</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Owner-reported on <time dateTime={launchOwnerRecord.recordedOn}>{launchOwnerRecord.displayDate}</time>. Excluded from the configuration score.</p>
          <div className="divide-y divide-line">
            {launchOwnerRecord.confirmations.map((confirmation) => (
              <div key={confirmation.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-ink">{confirmation.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{confirmation.detail}</p>
                </div>
                <div><AdminBadge tone="neutral">Owner confirmed</AdminBadge></div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="integration-heading" className="mt-8 border-t border-line pt-5">
          <h2 id="integration-heading" className="tr-admin-card-title text-ink">Integration configuration</h2>
          <p className="mt-1 mb-4 text-sm leading-6 text-muted">Presence, matching key modes and recorded Dashboard confirmations only. No live provider or database connectivity tests are run here.</p>
          <div className="divide-y divide-line">
            {checks.map((check) => (
              <div key={check.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-ink">{check.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{check.detail}</p>
                </div>
                <div><AdminBadge tone={check.status === "ready" ? "success" : check.status === "blocked" ? "danger" : "warning"}>
                  {check.status}
                </AdminBadge></div>
              </div>
            ))}
          </div>
        </section>

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
