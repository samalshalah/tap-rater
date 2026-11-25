import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge } from "@/components/admin/admin-ui";
import { MultiLinkSubscriptionActions } from "@/components/admin/multilink-subscription-actions";
import { MultiLinkForwardEditor } from "@/components/admin/multilink-forward-editor";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { readHostedPageForwardUrl } from "@/lib/hosted-pages/forward-link";
import { requireAdmin } from "@/lib/admin-auth";
import { marketingPlan } from "@/lib/marketing-plan";
import { formatPrice } from "@/lib/products";
import { listMultiLinkSubscriptions, listReviewsSubscriptions, multiLinkBilling, type MultiLinkSubscriptionRow } from "@/lib/reviews-subscription-admin";

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
  const forwards = await loadForwardLinks(multiLink ?? []);
  return (
    <AdminShell>
      <section className="tr-admin-section">
        <AdminPageHeader title="Subscriptions" description="Monthly Google Reviews and Multi-Link subscriptions. Stand purchases are in Orders." />
      </section>

      <Table id="google-reviews" title="Google Reviews" rows={reviews} empty="No Google Reviews subscriptions yet."
        head={["Customer", "Business", "Locations", "Monthly", "Status", "Renews / ends", "Actions"]}
        render={(row) => [
          <span className="tr-admin-person"><strong className="text-ink">{row.name || row.email}</strong>{row.name ? <span>{row.email}</span> : null}</span>,
          row.businesses || <span className="text-muted">Not set up yet</span>,
          row.locations,
          formatPrice(marketingPlan.monthlyCents * row.locations),
          <Status status={row.status} test={row.stripe_mode === "test"} canceling={row.cancel_at_period_end} />,
          date(row.current_period_end),
          row.stripe_subscription_id?.startsWith("sub_")
            ? <MultiLinkSubscriptionActions subscriptionId={row.stripe_subscription_id} status={row.status} cancelAtPeriodEnd={row.cancel_at_period_end} product="reviews" />
            : <span className="text-muted">—</span>
        ]} rowKey={(row) => row.stripe_subscription_id} />

      <Table id="multi-link" title="Multi-Link pages" rows={multiLink} empty="No Multi-Link subscriptions yet."
        head={["Customer", "Business", "Page", "Monthly", "Status", "Renews / ends", "Actions", "After it ends"]}
        render={(row) => [
          <span className="tr-admin-person"><strong className="text-ink">{row.name || row.email || "Customer"}</strong>{row.name && row.email ? <span>{row.email}</span> : null}</span>,
          row.business_name || "—",
          <a className="text-brand underline" href={row.hosted_page_url} target="_blank" rel="noopener noreferrer">{row.permanent_code}</a>,
          ...multiLinkCells(row),
          <MultiLinkForwardEditor key="f" code={row.permanent_code} initial={forwards[row.permanent_code]} />
        ]} rowKey={(row) => row.id} />
    </AdminShell>
  );
}

/** Pages that are ending or ended show their forwarding link straight away; live ones read it when opened. */
function isEnding(row: MultiLinkSubscriptionRow) {
  return row.cancel_at_period_end || row.status === "canceled" || !["ACTIVE", "REACTIVATED"].includes(row.lifecycle_status);
}

async function loadForwardLinks(rows: MultiLinkSubscriptionRow[]): Promise<Record<string, string | null>> {
  const ending = rows.filter(isEnding);
  if (!ending.length) return {};
  const storage = await getHostedPageStorage().catch(() => null);
  if (!storage) return {};
  const entries = await Promise.all(ending.map(async (row) => [row.permanent_code, await readHostedPageForwardUrl(storage, row.permanent_code)] as const));
  return Object.fromEntries(entries);
}

const lifecycleTone: Record<string, Tone> = { ACTIVE: "success", REACTIVATED: "success", PAST_DUE: "warning", CANCELLED_AT_PERIOD_END: "warning", EXPIRED: "neutral", RETIRED_INTERNAL: "neutral" };

/** Stripe pages show billing status; manual and complimentary pages show the page status, with no monthly charge. */
function multiLinkCells(row: { stripe_subscription_id: string; permanent_code: string; status: string; lifecycle_status: string; cancel_at_period_end: boolean; current_period_end: string | null }) {
  const billing = multiLinkBilling(row.stripe_subscription_id);
  if (billing === "stripe") return [formatPrice(multiLinkMonthlyCents), <Status key="s" status={row.status} canceling={row.cancel_at_period_end} />, date(row.current_period_end),
    <MultiLinkSubscriptionActions key="a" subscriptionId={row.stripe_subscription_id} code={row.permanent_code} status={row.status} cancelAtPeriodEnd={row.cancel_at_period_end} />];
  const lifecycle = row.lifecycle_status === "RETIRED_INTERNAL" ? "archived" : row.lifecycle_status.replaceAll("_", " ").toLowerCase();
  return [
    <span key="m" className="text-muted" title="Not billed through Stripe">—</span>,
    <span key="s"><AdminBadge tone="brand">{billing === "manual" ? "Manual order" : "Complimentary"}</AdminBadge><span className="ml-2"><AdminBadge tone={lifecycleTone[row.lifecycle_status] ?? "neutral"}>{lifecycle}</AdminBadge></span></span>,
    <span key="d" className="text-muted">No renewal</span>,
    <span key="a" className="text-muted">—</span>
  ];
}

function Status({ status, test = false, canceling }: { status: string; test?: boolean; canceling: boolean }) {
  return <>
    <AdminBadge tone={tones[status] ?? "neutral"}>{status.replaceAll("_", " ")}</AdminBadge>
    {test ? <span className="ml-2"><AdminBadge>Test</AdminBadge></span> : null}
    {canceling ? <span className="mt-1 block text-xs text-muted">Canceled · active until the end date</span> : null}
  </>;
}

function Table<T>({ id, title, rows, empty, head, render, rowKey }: { id: string; title: string; rows: T[] | null; empty: string; head: string[]; render: (row: T) => React.ReactNode[]; rowKey: (row: T) => string }) {
  return (
    <section id={id} className="tr-admin-section">
      <h2 className="text-lg font-semibold text-ink">{title}{rows ? <span className="ml-2 font-normal text-muted">· {rows.length}</span> : null}</h2>
      {rows === null ? <p className="mt-4 text-sm text-muted">Subscriptions could not be loaded.</p>
        : rows.length === 0 ? <p className="mt-4 text-sm text-muted">{empty}</p>
        : <div className="tr-admin-card mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="text-xs uppercase text-muted">{head.map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={rowKey(row)} className="border-t border-line align-top">{render(row).map((cell, i) => <td key={i} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
        </table></div>}
    </section>
  );
}
