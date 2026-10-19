import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge, AdminButton } from "@/components/admin/admin-ui";
import { GoogleReviewsPreview } from "@/components/admin/google-reviews-preview";
import { GoogleConnectButton } from "@/components/admin/google-connect-button";
import { requireAdmin } from "@/lib/admin-auth";
import { googleConnectionConfigured, googleConnectionSummary } from "@/lib/google-business/connection";
import { googleAdminIdentity } from "@/lib/google-business/http";

export const dynamic = "force-dynamic";

export default async function GoogleReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const identity = await googleAdminIdentity();
  const configured = googleConnectionConfigured();
  let storageReady = false;
  let connection: { email: string; updatedAt: string } | null = null;
  if (configured && identity) {
    try { connection = await googleConnectionSummary(identity.owner); storageReady = true; } catch { /* Show a setup status, never database errors. */ }
  }
  const outcome = (await searchParams).connection;
  const notices: Record<string, string> = { connected: "Google account connected. API approval and business permissions still determine access to reviews.", cancelled: "Google connection was cancelled. You can try again.", failed: "Google connection could not be completed. Sign in again and grant the requested permissions, or check server configuration.", disconnected: "Google account disconnected and stored tokens removed." };
  return <AdminShell><section className="tr-admin-section">
    <p className="tr-eyebrow">Integrations</p>
    <h1 className="tr-admin-title mt-2">Google reviews</h1>
    <p className="tr-body mt-3 max-w-3xl">Connect managed businesses, read their reviews, and prepare personal replies. The integration is being built; live syncing and publishing are not available yet.</p>
    <div className="mt-5"><AdminBadge tone={connection ? "success" : "warning"}>{connection ? "Account connected" : "Not connected"}</AdminBadge></div>
    {typeof outcome === "string" && notices[outcome] && <p role="status" className="mt-4 rounded-lg border border-line bg-white p-4 text-sm">{notices[outcome]}</p>}
    <section className="mt-6 rounded-xl border border-line bg-white p-6" aria-label="Google account connection">
      {connection && <p className="mb-4 text-sm">Connected Google account: <strong>{connection.email}</strong></p>}
      {!identity && <p className="mb-4 text-sm">Sign in to the admin account to connect Google. Local preview access alone cannot connect an account.</p>}
      {!configured && <p className="mb-4 text-sm">OAuth server configuration is not ready yet.</p>}
      {configured && identity && !storageReady && <p className="mb-4 text-sm">Secure connection storage needs setup before connecting.</p>}
      <GoogleConnectButton disabled={!identity || !configured || !storageReady} connected={Boolean(connection)} />
      {connection && <form action="/api/admin/google-business/disconnect" method="post" className="mt-3"><AdminButton type="submit">Disconnect Google and remove stored tokens</AdminButton></form>}
      <p className="mt-3 text-sm text-muted">Google tokens are encrypted on the server. Connecting an account does not publish replies or confirm API approval. In Google’s testing mode, you may need to reconnect after seven days.</p>
    </section>
    <section className="mt-6 rounded-xl border border-line bg-white p-6" aria-labelledby="google-setup-heading">
      <h2 id="google-setup-heading" className="tr-admin-card-title">Connection checklist</h2>
      <p className="mt-2 text-sm text-muted">Use the existing Google Cloud project: <strong>taprater-review-replies</strong>. This page does not check Google approval or quota automatically.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
        <li>Confirm Google API approval and a usable request quota.</li>
        <li>Configure the OAuth consent screen and a web application client in that same project.</li>
        <li>Verify the secure connection storage and complete Google sign-in.</li>
        <li>Connect the managing Google account and select an authorized business returned by Google.</li>
        <li>Test reading reviews before enabling individually approved replies.</li>
      </ol>
      <a className="mt-5 inline-block text-sm font-semibold text-brand underline" href="https://console.cloud.google.com/apis/dashboard?project=taprater-review-replies" target="_blank" rel="noreferrer">Open Google Cloud project</a>
    </section>
    <a href="/admin/google-reviews/workspaces" className="tr-button-primary mt-6">Open customer review workspaces</a>
    <GoogleReviewsPreview />
  </section></AdminShell>;
}
