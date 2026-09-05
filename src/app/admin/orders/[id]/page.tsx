import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert, AdminBadge, AdminCard, AdminLinkButton, AdminSoftPanel } from "@/components/admin/admin-ui";
import { OrderFulfillmentForm } from "@/components/admin/order-fulfillment-form";
import { OrderProductionActions } from "@/components/admin/order-production-actions";
import { OrderRefundForm } from "@/components/admin/order-refund-form";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { canAdvanceOrderFulfillment, canRunOrderProductionActions } from "@/lib/order-fulfillment-rules";
import { getAdminOrderById, getOrderLineItemProductionSummary, type OrderLineItem, type OrderRecord } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await requireAdmin();
  const { id } = await params;
  const { configured, order } = await getAdminOrderById(id);

  if (!configured || !order) {
    notFound();
  }

  const summaries = order.line_items_json.map(getOrderLineItemProductionSummary);
  const attentionItems = buildAttentionItems(order, summaries);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <AdminLinkButton href="/admin/orders" className="min-h-9 px-3 py-1.5 text-xs" variant="outline">Back to orders</AdminLinkButton>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">Order detail</p>
            <h1 className="tr-admin-title mt-2">{order.customer_name ?? "Customer order"}</h1>
            <p className="mt-2 font-mono text-xs text-muted">{order.stripe_checkout_session_id}</p>
          </div>
          <div className="tr-admin-card px-4 py-3 text-sm font-semibold text-ink">
            {formatPrice(order.total_cents)}
          </div>
        </div>

        {attentionItems.length ? <OrderAttentionCard items={attentionItems} /> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <InfoCard title="Customer">
              <Field label="Name" value={order.customer_name} />
              <Field label="Email" value={order.email} />
              <Field label="Phone" value={readNested(order.customer_details_json, ["phone"])} />
            </InfoCard>

            <InfoCard title="Shipping address">
              <AddressBlock address={order.shipping_address_json ?? order.customer_details_json} />
              <Field label="Shipping mode" value={order.shipping_mode ?? "manual"} />
              <Field label="Shipping amount" value={formatPrice(order.shipping_amount_cents)} />
            </InfoCard>

            <InfoCard title="Line items">
              <div className="space-y-4">
                {order.line_items_json.map((item, index) => (
                  <LineItemDetail key={`${item.productId}-${item.optionId ?? "base"}-${index}`} item={item} />
                ))}
              </div>
            </InfoCard>
          </div>

          <div className="space-y-6">
            <InfoCard title="Status">
              <Field label="Payment" value={formatPaymentStatus(order)} />
              <Field label="Payment status" value={order.payment_status} />
              <Field label="Refund ID" value={order.stripe_refund_id} />
              <Field label="Refunded at" value={order.refunded_at ? new Date(order.refunded_at).toLocaleString() : null} />
              <Field label="Production" value={order.production_status.replaceAll("_", " ")} />
              <Field label="Shipping" value={order.shipping_status.replaceAll("_", " ")} />
              <Field label="Shipped at" value={order.shipped_at ? new Date(order.shipped_at).toLocaleString() : null} />
              <Field label="Tracking" value={order.tracking_number} />
              <Field label="Tracking URL" value={order.tracking_url} link />
            </InfoCard>
            {order.id && (order.status === "paid" || order.payment_status === "paid" || order.payment_status === "refunded") ? (
              <OrderRefundForm
                orderId={order.id}
                alreadyRefunded={order.payment_status === "refunded"}
                hasSubscription={order.line_items_json.some((item) => item.destinationMode === "HOSTED")}
                refundId={order.stripe_refund_id}
              />
            ) : null}
            {order.id && canRunOrderProductionActions(order) ? <OrderProductionActions orderId={order.id} /> : null}
            <OrderFulfillmentForm order={order} />
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <AdminCard title={title}><div className="space-y-3">{children}</div></AdminCard>;
}

function OrderAttentionCard({ items }: { items: string[] }) {
  return (
    <div className="mt-6">
      <AdminAlert tone="warning">
        <p className="font-black text-ink">Order needs staff attention before production.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </AdminAlert>
    </div>
  );
}

function Field({ label, value, link = false }: { label: string; value?: string | null; link?: boolean }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[160px_1fr]">
      <p className="font-bold text-muted">{label}</p>
      {value ? (
        link ? (
          <a href={value} target="_blank" rel="noreferrer" className="break-all font-bold text-brand">
            {value}
          </a>
        ) : (
          <p className="break-all text-ink">{value}</p>
        )
      ) : (
        <p className="text-muted">-</p>
      )}
    </div>
  );
}

function AddressBlock({ address }: { address?: Record<string, unknown> | null }) {
  const addressObject = readAddressObject(address);
  return (
    <div className="space-y-2">
      <Field label="Recipient" value={readNested(address, ["name"])} />
      <Field label="Line 1" value={readNested(addressObject, ["line1"])} />
      <Field label="Line 2" value={readNested(addressObject, ["line2"])} />
      <Field label="City" value={readNested(addressObject, ["city"])} />
      <Field label="State" value={readNested(addressObject, ["state"])} />
      <Field label="Postal code" value={readNested(addressObject, ["postal_code"])} />
      <Field label="Country" value={readNested(addressObject, ["country"])} />
    </div>
  );
}

function LineItemDetail({ item }: { item: OrderLineItem }) {
  const summary = getOrderLineItemProductionSummary(item);

  return (
    <AdminSoftPanel>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-black text-ink">{item.quantity} x {item.title}</p>
          <p className="mt-1 font-mono text-xs uppercase text-muted">SKU {item.sku}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminBadge tone="neutral">{summary.optionLabel}</AdminBadge>
            <AdminBadge tone="neutral">{summary.nfcBehavior}</AdminBadge>
            <AdminBadge tone="neutral">{summary.printedQrLabel}</AdminBadge>
          </div>
        </div>
        <p className="font-black text-ink">{formatPrice(item.lineSubtotalCents)}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Destination URL" value={summary.destinationUrl} link />
        <Field label="QR target" value={summary.qrTargetUrl ?? summary.generatedQrValue} link />
        <Field label="NFC target" value={summary.nfcTargetUrl ?? summary.destinationUrl} link />
        <Field label="Business name" value={summary.businessName} />
        <Field label="Design assistance" value={readSetupBoolean(item.setup, "designAssistanceRequested") ? "Requested" : null} />
        <Field label="Design notes" value={readSetupString(item.setup, "designNotes")} />
        <Field label="Logo" value={summary.logoReference ?? summary.logoMediaUrl} link={Boolean(summary.logoMediaUrl)} />
        <Field label="QR production value" value={summary.generatedQrValue} link />
        <Field label="Front template" value={summary.frontTemplateUrl} link />
        <Field label="Artwork confirmed" value={summary.proofConfirmed ? "Yes" : "No"} />
        <Field label="Artwork approved at" value={readSetupString(item.setup, "proofApprovedAt")} />
        <Field label="Approval snapshot hash" value={summary.productionArtwork?.approvalSnapshotHash} />
        <Field label="Template/version" value={summary.productionArtwork ? `${summary.productionArtwork.templateId} / ${summary.productionArtwork.templateVersion}` : null} />
        <Field label="Production artwork" value={summary.productionArtwork?.status === "generated" ? summary.productionArtwork.url : summary.productionArtwork?.error} link={summary.productionArtwork?.status === "generated"} />
        <Field
          label="Artwork dimensions"
          value={
            summary.productionArtwork
              ? `${summary.productionArtwork.widthPx} x ${summary.productionArtwork.heightPx}px @ ${summary.productionArtwork.dpi} DPI (${summary.productionArtwork.widthIn.toFixed(2)} x ${summary.productionArtwork.heightIn.toFixed(2)} in)`
              : null
          }
        />
      </div>
      <LineItemVisuals item={item} />
      {summary.warnings.length ? (
        <AdminAlert tone="warning" className="mt-4">
          <p className="font-black text-ink">Production warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {summary.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </AdminAlert>
      ) : null}
    </AdminSoftPanel>
  );
}

function LineItemVisuals({ item }: { item: OrderLineItem }) {
  const summary = getOrderLineItemProductionSummary(item);
  const previewData = readSetupRecord(item.setup, "proofPreviewData");
  const previewLogo = summary.logoMediaUrl ?? readRecordString(previewData, "logoMediaUrl");
  const previewTemplate = summary.frontTemplateUrl ?? readRecordString(previewData, "frontTemplateUrl");
  const artworkUrl = summary.productionArtwork?.status === "generated" ? summary.productionArtwork.url : undefined;

  if (!previewLogo && !previewTemplate && !artworkUrl) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-4 border-t border-line pt-4 lg:grid-cols-3">
      {previewLogo ? (
        <PreviewAsset title="Uploaded logo" src={previewLogo} alt={`${item.title} customer logo`} />
      ) : null}
      {previewTemplate ? (
        <PreviewAsset title="Artwork template" src={previewTemplate} alt={`${item.title} artwork template`} />
      ) : null}
      {artworkUrl ? (
        <PreviewAsset title="Production artwork" src={artworkUrl} alt={`${item.title} production artwork`} />
      ) : (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          Production artwork is not generated yet. Use the artwork operations panel after confirming the artwork data.
        </div>
      )}
    </div>
  );
}

function PreviewAsset({ title, src, alt }: { title: string; src: string; alt: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.04em] text-muted">{title}</p>
      <div className="grid min-h-40 place-items-center overflow-hidden rounded-md bg-soft">
        <img src={src} alt={alt} className="max-h-52 max-w-full object-contain" />
      </div>
      <a href={src} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-semibold text-brand">
        Open asset
      </a>
    </div>
  );
}

function readNested(value: unknown, keys: string[]) {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" && current.trim() ? current : null;
}

function readSetupBoolean(setup: unknown, key: string) {
  return Boolean(setup && typeof setup === "object" && (setup as Record<string, unknown>)[key] === true);
}

function readAddressObject(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const address = (value as Record<string, unknown>).address;
  return address && typeof address === "object" ? (address as Record<string, unknown>) : value;
}

function readSetupString(setup: OrderLineItem["setup"], key: string) {
  if (!setup || typeof setup !== "object") return null;
  const value = (setup as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readSetupRecord(setup: OrderLineItem["setup"], key: string) {
  if (!setup || typeof setup !== "object") return null;
  const value = (setup as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readRecordString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function formatPaymentStatus(order: { status: string; payment_status?: string | null }) {
  if (order.payment_status === "refunded") return "Refunded";
  if (order.payment_status === "manual_unpaid") return "Submitted - payment pending review";
  if (order.status === "paid" || order.payment_status === "paid") return "Paid";
  return order.status.replaceAll("_", " ");
}

function buildAttentionItems(
  order: Pick<OrderRecord, "status" | "payment_status">,
  summaries: ReturnType<typeof getOrderLineItemProductionSummary>[]
) {
  const items = new Set<string>();
  if (!canAdvanceOrderFulfillment(order)) {
    items.add("Payment is not confirmed. Production and fulfillment actions are locked for this order.");
  }

  for (const summary of summaries) {
    if (summary.productionArtwork?.status === "generation_failed") {
      items.add(`Artwork generation failed: ${summary.productionArtwork.error ?? "unknown error"}`);
    }
    for (const warning of summary.warnings) {
      items.add(warning);
    }
  }

  return Array.from(items);
}
