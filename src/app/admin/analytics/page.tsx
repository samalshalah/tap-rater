import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AnalyticsControls } from "@/components/admin/analytics-controls";
import { LiveAnalyticsPanel } from "@/components/admin/live-analytics";
import { requireAdmin } from "@/lib/admin-auth";
import { storefrontAnalyticsReport } from "@/lib/storefront-analytics-report";
import type { ReactNode } from "react";
const money = (n: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n || 0) / 100,
  );
const ga = "https://analytics.google.com/analytics/web/#/a408858447p555155326/";
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const input = await searchParams;
  const days = [7, 30, 90].includes(Number(input.days))
    ? Number(input.days)
    : 30;
  let report;
  try {
    report = await storefrontAnalyticsReport(days);
  } catch {
    return (
      <AdminShell>
        <section className="tr-admin-section">
          <h1 className="tr-admin-title">Analytics</h1>
          <p role="alert" className="mt-6 tr-status-warning">
            Reports are temporarily unavailable. Please retry; no zero totals
            are being substituted for missing data.
          </p>
        </section>
      </AdminShell>
    );
  }
  const steps = [
    ["view_item", "Viewed a product"],
    ["add_to_cart", "Added to cart"],
    ["view_cart", "Viewed cart"],
    ["begin_checkout", "Started checkout"],
    ["add_shipping_info", "Submitted shipping"],
    ["payment_step", "Reached payment"],
    ["add_payment_info", "Submitted payment"],
    ["purchase", "Confirmed purchase"],
  ];
  const events = new Map(
    report.funnel.map((row) => [String(row.event_name), Number(row.sessions)]),
  );
  return (
    <AdminShell>
      <section className="tr-admin-section space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="tr-eyebrow">Store performance</p>
            <h1 className="tr-admin-title mt-2">Analytics</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              See where visitors come from, what they shop for, and where their
              journey stops. Sales come from confirmed live orders; visitor
              reports include consented sessions only.
            </p>
          </div>
          <form className="flex items-center gap-2">
            <label htmlFor="days" className="text-sm">
              Period
            </label>
            <select
              id="days"
              name="days"
              defaultValue={days}
              className="rounded-md border border-line p-2"
            >
              {[7, 30, 90].map((n) => (
                <option key={n} value={n}>
                  Last {n} days
                </option>
              ))}
            </select>
            <button className="tr-button-outline">Apply</button>
          </form>
        </div>
        <nav
          className="flex flex-wrap gap-4 text-sm font-semibold text-brand"
          aria-label="Analytics reports"
        >
          {[
            ["live", "Live activity"],
            ["sources", "Traffic sources"],
            ["landings", "Landing pages"],
            ["journey", "Checkout journey"],
            ["exits", "Exit pages"],
            ["products", "Products"],
            ["sales", "Sales & tracking"],
            ["testing", "Testing"],
          ].map(([id, label]) => (
            <a key={id} href={"#" + id}>
              {label}
            </a>
          ))}
        </nav>
        <LiveAnalyticsPanel />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card
            label="Tracked sessions"
            value={String(report.sessions.sessions)}
          />
          <Card
            label="Storefront page views"
            value={String(report.sessions.views)}
          />
          <Card
            label="Verified live orders"
            value={String(report.sales.orders)}
          />
          <Card
            label="Collected after refunds"
            value={money(
              Number(report.sales.collected) - Number(report.sales.refunded),
            )}
          />
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-ink">
          <strong>Reading these reports:</strong> journey collection starts with
          this release. Older orders remain visible, but their source is unknown
          when no consented session was saved. Periods are rolling windows
          ending now. Sales use order creation time and include tax and
          shipping; sessions are counted by their start time. Google reports may
          take time to update.
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            id="sources"
            title="Where customers come from"
            subtitle="Source, medium, and campaign for each tracked session. Purchases are linked live orders from those sessions. Tag promotional links with utm_source, utm_medium, and utm_campaign using short labels (letters, numbers, hyphens, underscores)."
          >
            <Table
              columns={[
                "Source",
                "Medium",
                "Campaign",
                "Sessions",
                "Purchases",
              ]}
              rows={report.sources.map((r) => [
                r.source,
                r.medium,
                r.campaign,
                r.sessions,
                r.purchases,
              ])}
            />
          </Panel>
          <Panel
            id="landings"
            title="Landing pages"
            subtitle="First consented page in each session. The visit may have begun earlier if consent was given later."
          >
            <Table
              columns={["Entry page", "Sessions", "Added to cart", "Purchases"]}
              rows={report.landings.map((r) => [
                r.landing_page,
                r.sessions,
                r.carts,
                r.purchases,
              ])}
            />
          </Panel>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            id="journey"
            title="Checkout progress"
            subtitle="Distinct sessions reaching each step, not a forced sequence. Repeat actions within a session count once; a stored cart can skip earlier steps."
          >
            <div className="space-y-4">
              {steps.map(([key, label]) => {
                const count = events.get(key) || 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded bg-gray-100">
                      <div
                        className="h-full rounded bg-brand"
                        style={{
                          width:
                            Math.min(
                              100,
                              (count /
                                Math.max(1, Number(report.sessions.sessions))) *
                                100,
                            ) + "%",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 border-t border-line pt-4 text-sm">
              Sessions with checkout errors:{" "}
              <strong>{events.get("checkout_error") || 0}</strong> · Payment
              errors: <strong>{events.get("payment_error") || 0}</strong>
            </p>
            <p className="mt-3 text-xs text-muted">
              An error can be followed by a successful retry. It does not
              necessarily mean an abandoned order.
            </p>
          </Panel>
          <Panel
            id="exits"
            title="Last pages of inactive sessions"
            subtitle="Last measured page and action after 30 minutes without activity. This indicates where measurement stopped, not why someone left."
          >
            <Table
              columns={["Last page", "Last action", "Sessions"]}
              rows={report.exits.map((r) => [
                r.page,
                String(r.event_name).replaceAll("_", " "),
                r.sessions,
              ])}
            />
          </Panel>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            id="products"
            title="Product interest"
            subtitle="Sessions viewing or adding each product. A session may contain several products."
          >
            <Table
              columns={["Product", "Viewed", "Added to cart"]}
              rows={report.products.map((r) => [r.item_id, r.views, r.carts])}
            />
          </Panel>
          <Panel
            id="devices"
            title="Desktop, mobile & tablet"
            subtitle="Compare device categories before drawing conclusions about checkout usability."
          >
            <Table
              columns={["Device", "Sessions", "Started checkout"]}
              rows={report.devices.map((r) => [
                r.device,
                r.sessions,
                r.checkouts,
              ])}
            />
          </Panel>
        </div>
        <Panel
          id="sales"
          title="Verified sales & GA4 delivery"
          subtitle="Test-mode payments and explicitly excluded test orders are removed from sales totals. Google submission is a delivery status, not confirmation that its reports have processed the event."
        >
          <div className="mb-5 flex flex-wrap gap-5 text-sm">
            <span>
              Gross collected: <strong>{money(report.sales.collected)}</strong>
            </span>
            <span>
              Refunded: <strong>{money(report.sales.refunded)}</strong>
            </span>
            <span>
              Orders with a tracked session:{" "}
              <strong>{report.sales.attributed}</strong>
            </span>
            <span>
              Submitted to GA4: <strong>{report.sales.submitted}</strong>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Order",
                    "Created (UTC)",
                    "Paid total",
                    "Analytics status",
                    "Testing",
                  ].map((v) => (
                    <th key={v} className="border-b border-line p-3">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.orders.map((r) => (
                  <tr key={String(r.id)} className="border-b border-line">
                    <td className="p-3">
                      <Link
                        className="text-brand underline"
                        href={"/admin/orders/" + r.id}
                      >
                        View order
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(String(r.created_at))
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="p-3">{money(r.total_cents)}</td>
                    <td className="p-3">{String(r.tracking)}</td>
                    <td className="p-3">
                      <AnalyticsControls
                        orderId={String(r.id)}
                        excluded={Boolean(r.excluded)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report.orders.length ? (
              <p className="p-4 text-muted">
                No paid live orders in this period.
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel
          id="testing"
          title="Testing & tracking health"
          subtitle="Admin browsers are automatically excluded from future tracking, including after signing out. Use the button on any additional testing browser after signing in."
        >
          <AnalyticsControls />
          <p className="mt-4 text-sm text-muted">
            Browser exclusions last one year or until cookies are cleared. They
            do not remove earlier visits from GA4. Excluding a test order
            affects this dashboard and prevents future submission; it cannot
            retract an event already sent to Google.
          </p>
          <p className="mt-4 text-sm">
            Server purchase reporting:{" "}
            <strong>
              {process.env.GA4_API_SECRET
                ? "Configured · retries every 15 minutes"
                : "Awaiting Google API secret"}
            </strong>
          </p>
          <p className="mt-2 text-sm text-muted">
            Purchases without analytics consent remain in verified sales but are
            not sent to Google. Session details are retained for 90 days.
          </p>
        </Panel>
        <Panel
          id="google"
          title="Google Analytics reports"
          subtitle="Open historical GA4 reports for deeper exploration. These are separate from the live order and consented-session reports above."
        >
          <div className="flex flex-wrap gap-4">
            {[
              ["Landing pages", "reports/explorer?r=landing-page"],
              [
                "Traffic acquisition",
                "reports/explorer?r=lifecycle-traffic-acquisition-v2",
              ],
              ["Purchase journey", "reports/explorer?r=ecomm-shopping-funnel"],
              ["GA4 overview", "reports/intelligenthome"],
            ].map(([label, url]) => (
              <a
                key={label}
                href={ga + url}
                target="_blank"
                rel="noreferrer"
                className="tr-button-outline"
              >
                {label}
              </a>
            ))}
            <Link className="tr-button-outline" href="/admin/analytics/devices">
              NFC tap reports
            </Link>
          </div>
        </Panel>
      </section>
    </AdminShell>
  );
}
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
function Panel({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-lg border border-line bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 mb-5 text-sm leading-6 text-muted">{subtitle}</p>
      {children}
    </section>
  );
}
function Table({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="border-b border-line p-3 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line">
              {r.map((v, j) => (
                <td key={j} className="p-3 break-words">
                  {String(v ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? (
        <p className="py-8 text-center text-sm text-muted">
          No tracked activity yet for this period.
        </p>
      ) : null}
    </div>
  );
}
