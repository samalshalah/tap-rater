import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { marketingPlan } from "@/lib/marketing-plan";
import { formatPrice } from "@/lib/products";
import { listMultiLinkSubscriptions, listReviewsSubscriptions } from "@/lib/reviews-subscription-admin";

export const dynamic = "force-dynamic";

type Tone = "success" | "warning" | "danger" | "neutral";
const tones: Record<string, Tone> = { active: "success", trialing: "success", past_due: "warning", incomplete: "warning", unpaid: "danger", canceled: "neutral", cancelled: "neutral", incomplete_expired: "neutral", unknown: "neutral" };
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const multiLinkMonthlyCents = 999;

/** Monthly service subscriptions. Kept apart from stand orders, which need production and shipping. */
export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const [reviews, multiLink] = await Promise.all([
    listReviewsSubscriptions().catch(() => null),
    listMultiLinkSubscriptions().catch(() => null)
  ]);
  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Commerce</p>
        <h1 className="tr-admin-title mt-3">Subscriptions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Monthly Google Reviews and Multi-Link subscriptions. Stand purchases are in Orders.</p>
      </section>

      <Table id="google-reviews" title="Google Reviews" rows={reviews} empty="No Google Reviews subscriptions yet."
        head={["Customer", "Business", "Locations", "Monthly", "Status", "Renews / ends"]}
        render={(row) => [
          <><strong className="block text-ink">{row.name || row.email}</strong><span className="text-xs text-muted">{row.email}</span></>,
          row.businesses || <span className="text-muted">Not set up yet</span>,
          row.locations,
          formatPrice(marketingPlan.monthlyCents * row.locations),
          <Status status={row.status} test={row.stripe_mode === "test"} canceling={row.cancel_at_period_end} />,
          date(row.current_period_end)
        ]} rowKey={(row) => row.stripe_subscription_id} />

      <Table id="multi-link" title="Multi-Link pages" rows={multiLink} empty="No Multi-Link subscriptions yet."
        head={["Customer", "Business", "Page", "Monthly", "Status", "Renews / ends"]}
        render={(row) => [
          <><strong className="block text-ink">{row.name || row.email || "Customer"}</strong>{row.email ? <span className="text-xs text-muted">{row.email}</span> : null}</>,
          row.business_name || "—",
          <a className="text-brand underline" href={row.hosted_page_url} target="_blank" rel="noopener noreferrer">{row.permanent_code}</a>,
          formatPrice(multiLinkMonthlyCents),
          <Status status={row.status} canceling={row.cancel_at_period_end} />,
          date(row.current_period_end)
        ]} rowKey={(row) => row.id} />
    </AdminShell>
  );
}

function Status({ status, test = false, canceling }: { status: string; test?: boolean; canceling: boolean }) {
  return <>
    <AdminBadge tone={tones[status] ?? "neutral"}>{status.replaceAll("_", " ")}</AdminBadge>
    {test ? <span className="ml-2"><AdminBadge>Test</AdminBadge></span> : null}
    {canceling ? <span className="mt-1 block text-xs text-muted">Renewal canceled</span> : null}
  </>;
}

function Table<T>({ id, title, rows, empty, head, render, rowKey }: { id: string; title: string; rows: T[] | null; empty: string; head: string[]; render: (row: T) => React.ReactNode[]; rowKey: (row: T) => string }) {
  return (
    <section id={id} className="tr-admin-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {rows ? <div className="tr-admin-card px-4 py-3 text-sm font-semibold text-ink">{rows.length} {rows.length === 1 ? "subscription" : "subscriptions"}</div> : null}
      </div>
      {rows === null ? <p className="mt-4 text-sm text-muted">Subscriptions could not be loaded.</p>
        : rows.length === 0 ? <p className="mt-4 text-sm text-muted">{empty}</p>
        : <div className="tr-admin-card mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="text-xs uppercase text-muted">{head.map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={rowKey(row)} className="border-t border-line align-top">{render(row).map((cell, i) => <td key={i} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
        </table></div>}
    </section>
  );
}
