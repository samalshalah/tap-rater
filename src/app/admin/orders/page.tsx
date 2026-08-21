import { AdminShell } from "@/components/admin/admin-shell";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminOrders,
  getOrderLineItemProductionSummary,
  type OrderLineItem,
  type OrderLineItemProductionSummary,
  type OrderRecord
} from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type AdminOrdersPageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdmin();
  const { configured, orders } = await getAdminOrders();
  const params = await searchParams;
  const activeFilter = params?.filter ?? "all";
  const filteredOrders = filterOrders(orders, activeFilter);

  return (
    <AdminShell>
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-12">
        <p className="text-sm font-black uppercase text-brand">Commerce</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black text-ink">Orders</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Stripe checkout creates pending orders, and the Stripe webhook marks them paid after checkout completes.
            </p>
          </div>
          <div className="rounded-md border border-line bg-white px-4 py-3 text-sm font-bold text-ink">
            {filteredOrders.length} orders
          </div>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
            Database persistence is not configured yet. Stripe checkout stays disabled until orders can be persisted.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total orders" value={String(orders.length)} />
          <SummaryCard label="Paid" value={String(orders.filter((order) => order.status === "paid").length)} />
          <SummaryCard label="Pending" value={String(orders.filter((order) => order.status === "pending_payment").length)} />
          <SummaryCard label="Revenue" value={formatPrice(orders.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.total_cents, 0))} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["paid", "Paid"],
            ["pending", "Pending"],
            ["production", "Production"],
            ["shipped", "Shipped"]
          ].map(([value, label]) => (
            <Link
              key={value}
              href={value === "all" ? "/admin/orders" : `/admin/orders?filter=${value}`}
              className={activeFilter === value ? "rounded-full bg-ink px-4 py-2 text-xs font-black uppercase text-white" : "rounded-full border border-line bg-white px-4 py-2 text-xs font-black uppercase text-ink"}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto rounded-md border border-line bg-white shadow-sm">
          <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
                <th className="p-4">Stripe session</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Fulfillment</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.stripe_checkout_session_id} className="border-b border-line last:border-b-0">
                  <td className="p-4">
                    <p className="font-mono text-xs text-ink">{order.stripe_checkout_session_id}</p>
                    {order.id ? (
                      <Link href={`/admin/orders/${order.id}`} className="mt-2 inline-flex rounded-md border border-line px-3 py-1 text-xs font-black text-ink">
                        View order
                      </Link>
                    ) : null}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-ink">{order.customer_name ?? "Customer"}</p>
                    <p className="text-muted">{order.email ?? "-"}</p>
                  </td>
                  <td className="p-4 text-muted">
                    {order.line_items_json.length > 0
                      ? order.line_items_json.map((item) => (
                          <OrderLineItemSummary key={`${item.productId}-${item.optionId ?? "base"}`} item={item} />
                        ))
                      : "-"}
                  </td>
                  <td className="p-4">
                    <OrderFulfillmentBadges order={order} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill tone={order.production_status === "completed" ? "ready" : "neutral"}>{formatStatus(order.production_status)}</StatusPill>
                      <StatusPill tone={order.shipping_status === "shipped" || order.shipping_status === "delivered" ? "ready" : "neutral"}>{formatStatus(order.shipping_status)}</StatusPill>
                    </div>
                  </td>
                  <td className="p-4 font-black text-ink">{formatPrice(order.total_cents)}</td>
                  <td className="p-4">
                    <span className={order.status === "paid" ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-ink"}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 text-muted">{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No Stripe orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function filterOrders(orders: OrderRecord[], filter: string) {
  if (filter === "paid") return orders.filter((order) => order.status === "paid");
  if (filter === "pending") return orders.filter((order) => order.status === "pending_payment");
  if (filter === "production") return orders.filter((order) => order.production_status !== "completed" && order.shipping_status !== "shipped" && order.shipping_status !== "delivered");
  if (filter === "shipped") return orders.filter((order) => order.shipping_status === "shipped" || order.shipping_status === "delivered");
  return orders;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function OrderLineItemSummary({ item }: { item: OrderLineItem }) {
  const summary = getOrderLineItemProductionSummary(item);

  return (
    <div className="mb-3 rounded-lg border border-line bg-white p-3 text-xs text-ink shadow-sm last:mb-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-ink">{item.quantity} x {item.title}</p>
          <p className="mt-1 font-mono text-[11px] uppercase text-muted">SKU {item.sku}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone="neutral">{summary.optionLabel}</StatusPill>
            <StatusPill tone={summary.nfcBehavior === "NFC only" ? "neutral" : "ready"}>{summary.nfcBehavior}</StatusPill>
            <StatusPill tone={summary.printedQrLabel === "No printed QR" ? "neutral" : "ready"}>{summary.printedQrLabel}</StatusPill>
          </div>
        </div>
        <div className="text-left lg:text-right">
          <p className="font-black text-ink">{formatPrice(item.lineSubtotalCents)}</p>
          <p className="mt-1 text-muted">{formatPrice(item.unitAmountCents)} each</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <FulfillmentField label="Destination URL" value={summary.destinationUrl} link />
        <FulfillmentField label="Destination type" value={summary.destinationType} />
        <FulfillmentField label="Platform" value={summary.platformSlug} />
        {summary.fulfillmentKind !== "standard" ? (
          <>
            <FulfillmentField label="Business name" value={summary.businessName} />
            <FulfillmentField label="Logo" value={summary.logoReference ? "Uploaded" : undefined} detail={summary.logoReference} />
            <FulfillmentField label="QR value" value={summary.generatedQrValue ? "Generated" : undefined} detail={summary.generatedQrValue} link />
            <FulfillmentField label="Front template" value={summary.frontTemplateUrl ? "Attached" : undefined} detail={summary.frontTemplateUrl} link />
            <FulfillmentField label="Proof confirmed" value={summary.proofConfirmed ? "Yes" : "No"} />
          </>
        ) : null}
      </div>

      {summary.fulfillmentKind !== "standard" ? <ProofAssetStrip summary={summary} /> : null}

      <div className="mt-3">
        <ProductionStatus summary={summary} />
      </div>
    </div>
  );
}

function OrderFulfillmentBadges({ order }: { order: OrderRecord }) {
  const summaries = order.line_items_json.map(getOrderLineItemProductionSummary);
  const hasWarnings = summaries.some((summary) => summary.warnings.length > 0);
  const hasBranded = summaries.some((summary) => summary.fulfillmentKind === "branded");
  const hasStandard = summaries.some((summary) => summary.fulfillmentKind === "standard");
  const hasHosted = summaries.some((summary) => summary.fulfillmentKind === "hosted");

  return (
    <div className="flex max-w-xs flex-wrap gap-2">
      <StatusPill tone={order.status === "paid" ? "ready" : "warning"}>
        {order.status === "paid" ? "Paid" : "Payment pending"}
      </StatusPill>
      {hasStandard ? <StatusPill tone="neutral">Standard Direct - NFC only</StatusPill> : null}
      {hasBranded ? (
        <StatusPill tone={hasWarnings ? "warning" : "ready"}>
          {hasWarnings ? "Needs proof data" : "Branded + QR - proof confirmed"}
        </StatusPill>
      ) : null}
      {hasHosted ? <StatusPill tone="warning">Hosted setup pending</StatusPill> : null}
      {!hasWarnings && order.status === "paid" ? <StatusPill tone="ready">Ready for production review</StatusPill> : null}
    </div>
  );
}

function ProductionStatus({ summary }: { summary: OrderLineItemProductionSummary }) {
  if (summary.fulfillmentKind === "standard") {
    return (
      <div className="rounded-md border border-teal-100 bg-teal-50 p-2 text-xs text-brand">
        <p className="font-black">{summary.statusLabel}</p>
        <p className="mt-1 text-ink">Standard Direct is NFC only. No logo, printed QR, or proof approval is required.</p>
      </div>
    );
  }

  if (summary.warnings.length === 0) {
    return (
      <div className="rounded-md border border-teal-100 bg-teal-50 p-2 text-xs text-brand">
        <p className="font-black">{summary.statusLabel}</p>
        <p className="mt-1 text-ink">Logo, business name, QR value, and proof confirmation are present. Review the proof before production.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
      <p className="font-black">Manual production review required</p>
      <p className="mt-1">
        {summary.fulfillmentKind === "custom"
          ? "Collect/confirm custom design details before printing."
          : "Collect/confirm logo, business details, QR, and proof before printing."}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {summary.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
      <p className="mt-2 font-black">Do not print until the missing setup data is resolved and proof is approved.</p>
    </div>
  );
}

function ProofAssetStrip({ summary }: { summary: OrderLineItemProductionSummary }) {
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-line bg-gray-50 p-2 sm:grid-cols-3">
      <AssetPreview label="Logo thumbnail" src={summary.logoMediaUrl} fallback={summary.logoReference} />
      <AssetPreview label="Front template" src={summary.frontTemplateUrl} fallback={summary.frontTemplateUrl} />
      <div className="rounded-md border border-line bg-white p-2">
        <p className="text-[11px] font-black uppercase text-muted">QR value</p>
        {summary.generatedQrValue ? (
          <p className="mt-2 break-all font-mono text-[11px] text-ink">{summary.generatedQrValue}</p>
        ) : (
          <p className="mt-2 font-bold text-amber-700">Missing</p>
        )}
      </div>
    </div>
  );
}

function AssetPreview({ label, src, fallback }: { label: string; src?: string; fallback?: string }) {
  const canRenderImage = src && (src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://"));

  return (
    <div className="rounded-md border border-line bg-white p-2">
      <p className="text-[11px] font-black uppercase text-muted">{label}</p>
      {canRenderImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="mt-2 h-20 w-full rounded border border-line object-contain p-1" />
      ) : fallback ? (
        <p className="mt-2 break-all font-mono text-[11px] text-ink">{fallback}</p>
      ) : (
        <p className="mt-2 font-bold text-amber-700">Missing</p>
      )}
    </div>
  );
}

function FulfillmentField({
  label,
  value,
  detail,
  link = false
}: {
  label: string;
  value?: string;
  detail?: string;
  link?: boolean;
}) {
  const href = link && detail && isHttpUrl(detail) ? detail : link && value && isHttpUrl(value) ? value : undefined;

  return (
    <div className="rounded-md border border-line bg-gray-50 p-2">
      <p className="text-[11px] font-black uppercase text-muted">{label}</p>
      {value ? (
        href ? (
          <a href={href} className="mt-1 block break-all font-bold text-brand" target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          <p className="mt-1 break-words font-bold text-ink">{value}</p>
        )
      ) : (
        <p className="mt-1 font-bold text-amber-700">Missing</p>
      )}
      {detail && detail !== value ? <p className="mt-1 break-all font-mono text-[11px] text-muted">{detail}</p> : null}
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "ready" | "warning" | "neutral" }) {
  const className =
    tone === "ready"
      ? "bg-teal-50 text-brand"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800"
        : "bg-gray-100 text-muted";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${className}`}>{children}</span>;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
