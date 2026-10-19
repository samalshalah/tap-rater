import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge } from "@/components/admin/admin-ui";
import { GoogleReviewsPreview } from "@/components/admin/google-reviews-preview";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function GoogleReviewsPage() {
  await requireAdmin();
  return <AdminShell><section className="tr-admin-section">
    <p className="tr-eyebrow">Integrations</p>
    <h1 className="tr-admin-title mt-2">Google reviews</h1>
    <p className="tr-body mt-3 max-w-3xl">Connect managed businesses, read their reviews, and prepare personal replies. The integration is being built; live syncing and publishing are not available yet.</p>
    <div className="mt-5"><AdminBadge tone="warning">Not connected</AdminBadge></div>
    <section className="mt-6 rounded-xl border border-line bg-white p-6" aria-labelledby="google-setup-heading">
      <h2 id="google-setup-heading" className="tr-admin-card-title">Connection checklist</h2>
      <p className="mt-2 text-sm text-muted">Use the existing Google Cloud project: <strong>taprater-review-replies</strong>. This page does not check Google approval or quota automatically.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
        <li>Confirm Google API approval and a usable request quota.</li>
        <li>Configure the OAuth consent screen and a web application client in that same project.</li>
        <li>Complete secure connection storage, the OAuth callback, and disconnect support.</li>
        <li>Connect the managing Google account and select an authorized business returned by Google.</li>
        <li>Test reading reviews before enabling individually approved replies.</li>
      </ol>
      <a className="mt-5 inline-block text-sm font-semibold text-brand underline" href="https://console.cloud.google.com/apis/dashboard?project=taprater-review-replies" target="_blank" rel="noreferrer">Open Google Cloud project</a>
    </section>
    <GoogleReviewsPreview />
  </section></AdminShell>;
}
