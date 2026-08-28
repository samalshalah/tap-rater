import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert } from "@/components/admin/admin-ui";
import { RequestInbox } from "@/components/admin/request-inbox";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getAdminRequestsFromClient, type RequestReadClient } from "@/lib/request-repository";

export default async function AdminRequestsPage() {
  await requireAdmin();
  const isConfigured = hasSupabaseAdminConfig();
  const requests = isConfigured
    ? await getAdminRequestsFromClient(getSupabaseAdmin() as RequestReadClient)
    : { contacts: [], setups: [], linkChanges: [] };

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Admin</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="tr-admin-title">Requests</h1>
            <p className="mt-3 max-w-3xl leading-7 text-muted">
              Manage customer questions, setup submissions, and Tap Rater link change requests before checkout is live.
            </p>
          </div>
          <div className="tr-admin-card p-4 text-sm">
            <p className="font-semibold text-ink">{requests.contacts.length + requests.setups.length + requests.linkChanges.length}</p>
            <p className="mt-1 text-muted">total requests</p>
          </div>
        </div>

        {!isConfigured ? (
          <AdminAlert className="mt-6" tone="warning">
            Database persistence is not configured yet. Add DATABASE_URL for Neon, or Supabase server credentials, to view saved requests.
          </AdminAlert>
        ) : null}

        <div className="mt-8">
          <RequestInbox requests={requests} />
        </div>
      </section>
    </AdminShell>
  );
}
