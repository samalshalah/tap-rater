import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert, AdminSummaryCard } from "@/components/admin/admin-ui";
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
  const allRequests = [...requests.contacts, ...requests.setups, ...requests.linkChanges];

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <AdminPageHeader title="Requests" description="Customer questions, setup submissions and link changes, from intake through resolution." />

        {!isConfigured ? (
          <AdminAlert className="mt-6" tone="warning">
            Database persistence is not configured yet. Add DATABASE_URL for Neon, or Supabase server credentials, to view saved requests.
          </AdminAlert>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <AdminSummaryCard label="New" value={String(allRequests.filter((request) => request.status === "new").length)} />
          <AdminSummaryCard label="In progress" value={String(allRequests.filter((request) => request.status === "in_progress").length)} />
          <AdminSummaryCard label="Resolved" value={String(allRequests.filter((request) => request.status === "resolved").length)} />
        </div>

        <div className="mt-8">
          <RequestInbox requests={requests} />
        </div>
      </section>
    </AdminShell>
  );
}
