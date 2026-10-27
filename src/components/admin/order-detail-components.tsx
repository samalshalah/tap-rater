import { publicProofHistory } from "@/lib/stand-proof-history";
import { PrintArtworkDownload } from "@/components/admin/print-artwork-download";
import { AdminAlert, AdminBadge, AdminCard, AdminSoftPanel } from "@/components/admin/admin-ui";
import { OrderDesignFiles } from "@/components/admin/order-design-files";
import type { ReactNode } from "react";
import { canAdvanceOrderFulfillment } from "@/lib/order-fulfillment-rules";
import { getOrderLineItemProductionSummary, type OrderLineItem, type OrderRecord } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { getAdminOrderDesignAssetUrl, getOrderLogoStorageKey, getOrderStandardDesignUrl } from "@/lib/order-design-assets";

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <AdminCard title={title}><div className="space-y-3">{children}</div></AdminCard>;
}

export function OrderAttentionCard({ items }: { items: string[] }) {
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

export function Field({ label, value, link = false }: { label: string; value?: string | null; link?: boolean }) {
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

export function AddressBlock({ address }: { address?: Record<string, unknown> | null }) {
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

export function LineItemDetail({ item, artworkUrl, order, index, standIds }: { standIds:string[]; item: OrderLineItem; artworkUrl?: string; order: OrderRecord; index: number }) {
  const summary = getOrderLineItemProductionSummary(item);
  const originalLogo = getOrderLogoStorageKey(item);
  const printLogo = getOrderLogoStorageKey(item, false);

  return (
    <AdminSoftPanel>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="break-words font-black text-ink">{item.quantity} x {item.title}</p>
          <p className="mt-1 break-all font-mono text-xs uppercase text-muted">SKU {item.sku}</p>
          {!!standIds.length&&<details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">Stand IDs ({standIds.length})</summary>{standIds.map(id=><p key={id} className="mt-1 break-all font-mono">{id}</p>)}</details>}
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
        {summary.printedQrLabel !== "No printed QR (NFC only)" ? <Field label="QR target" value={summary.qrTargetUrl ?? summary.generatedQrValue} link /> : null}
        <Field label="NFC target" value={summary.nfcTargetUrl ?? summary.destinationUrl} link />
        <Field label="Business name" value={summary.businessName} />
        <Field label="Design assistance" value={readSetupBoolean(item.setup, "designAssistanceRequested") ? "Requested" : null} />
        <Field label="Design notes" value={readSetupString(item.setup, "designNotes")} />
        <Field label="Logo" value={readSetupString(item.setup, "logoFileName") ?? (originalLogo ? "Uploaded" : "Not attached")} />
        {summary.printedQrLabel !== "No printed QR (NFC only)" ? <Field label="QR production value" value={summary.generatedQrValue} link /> : null}
        <Field label="Front template" value={summary.frontTemplateUrl} link />
        <Field label="Artwork confirmed" value={summary.proofConfirmed ? "Yes" : "No"} />
        <Field label="Artwork approved at" value={readSetupString(item.setup, "proofApprovedAt")} />
        <Field label="Approval snapshot hash" value={summary.productionArtwork?.approvalSnapshotHash} />
        <Field label="Template/version" value={summary.productionArtwork ? `${summary.productionArtwork.templateId} / ${summary.productionArtwork.templateVersion}` : null} />
        <Field label="Production artwork" value={summary.productionArtwork?.status === "generated" ? "Ready to download" : summary.productionArtwork?.error} />
        <Field
          label="Artwork dimensions"
          value={
            summary.productionArtwork
              ? `${summary.productionArtwork.widthPx} x ${summary.productionArtwork.heightPx}px @ ${summary.productionArtwork.dpi} DPI (${summary.productionArtwork.widthIn.toFixed(2)} x ${summary.productionArtwork.heightIn.toFixed(2)} in)`
              : null
          }
        />
      </div>
      <OrderDesignFiles
        standardDesignUrl={getOrderStandardDesignUrl(item)}
        artworkUrl={summary.productionArtwork?.status === "generated" ? artworkUrl : undefined}
        originalLogoUrl={originalLogo ? getAdminOrderDesignAssetUrl(order, index, "original-logo") : undefined}
        printLogoUrl={printLogo && printLogo !== originalLogo ? getAdminOrderDesignAssetUrl(order, index, "print-logo") : undefined}
        textUrl={getAdminOrderDesignAssetUrl(order, index, "text")}
        businessName={summary.businessName}
      />
      <LineItemVisuals item={item} downloadUrl={artworkUrl} />
      {Boolean(item.setup?.customerProofCorrection)&&<AdminAlert tone="warning" className="mt-4"><p className="font-semibold">Customer requested corrections</p><p className="whitespace-pre-wrap">{readSetupString(item.setup?.customerProofCorrection as Record<string,unknown>,"notes")}</p></AdminAlert>}
      {!!publicProofHistory(item).length&&<details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Customer proof history</summary><ol className="mt-2 divide-y">{publicProofHistory(item).map(event=><li key={event.id} className="py-2"><p>{event.action==='uploaded'?'Proof uploaded':event.action==='approved'?'Design approved':'Corrections requested'} - {event.at}</p>{event.notes&&<p className="whitespace-pre-wrap text-muted">{event.notes}</p>}</li>)}</ol></details>}
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

function LineItemVisuals({ item, downloadUrl }: { item: OrderLineItem; downloadUrl?: string }) {
  const standardDesignUrl = getOrderStandardDesignUrl(item);
  const summary = getOrderLineItemProductionSummary(item);
  const previewData = readSetupRecord(item.setup, "proofPreviewData");
  const previewLogo = summary.logoMediaUrl ?? readRecordString(previewData, "logoMediaUrl");
  const previewTemplate = standardDesignUrl ?? summary.frontTemplateUrl ?? readRecordString(previewData, "frontTemplateUrl");
  const artworkUrl = summary.productionArtwork?.status === "generated" ? downloadUrl : undefined;

  if (!previewLogo && !previewTemplate && !artworkUrl) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-4 border-t border-line pt-4 lg:grid-cols-3">
      {previewLogo ? (
        <PreviewAsset title="Uploaded logo" src={previewLogo} alt={`${item.title} customer logo`} />
      ) : null}
      {previewTemplate ? (
        <PreviewAsset title={standardDesignUrl ? "Standard production design" : "Artwork template"} src={previewTemplate} downloadUrl={standardDesignUrl} standard alt={`${item.title} artwork template`} />
      ) : null}
      {artworkUrl ? (
        <PreviewAsset title="Production artwork" src={`${artworkUrl}?preview=1`} downloadUrl={artworkUrl} alt={`${item.title} production artwork`} />
      ) : item.optionId === "branded_qr_direct" ? (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
          Final artwork is generated after confirmed payment. Check production warnings if the file is unavailable.
        </div>
      ) : null}
    </div>
  );
}

function PreviewAsset({ title, src, alt, downloadUrl, standard = false }: { title: string; src: string; alt: string; downloadUrl?: string; standard?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.04em] text-muted">{title}</p>
      <div className="grid min-h-40 place-items-center overflow-hidden rounded-md bg-soft">
        <img src={src} alt={alt} className="max-h-52 max-w-full object-contain" />
      </div>
      {downloadUrl ? (
        <div className="mt-3"><PrintArtworkDownload url={downloadUrl} standard={standard} /></div>
      ) : null}
      <a href={src} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-semibold text-brand">
        {downloadUrl ? "View preview (opens in a new tab)" : "Open preview"}
      </a>
    </div>
  );
}

export function readNested(value: unknown, keys: string[]) {
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

export function formatPaymentStatus(order: { status: string; payment_status?: string | null }) {
  if (order.payment_status === "complimentary") return "Complimentary â€” no payment due";
  if (order.payment_status === "refunded") return "Refunded";
  if (order.payment_status === "refund_pending") return "Refund pending";
  if (order.payment_status === "refund_failed") return "Refund needs review";
  if (order.payment_status === "partially_refunded") return "Partially refunded";
  if (order.payment_status === "manual_unpaid") return "Submitted - payment pending review";
  if (order.status === "paid" || order.payment_status === "paid") return "Paid";
  if (order.status === "pending_payment") return "Unfinished checkout â€” awaiting payment";
  return order.status.replaceAll("_", " ");
}

export function buildAttentionItems(
  order: Pick<OrderRecord, "status" | "payment_status">,
  summaries: ReturnType<typeof getOrderLineItemProductionSummary>[]
) {
  const items = new Set<string>();
  if (!canAdvanceOrderFulfillment(order)) {
    items.add(order.payment_status?.includes("refund")
      ? "This order has a refund. Production and fulfillment actions are locked."
      : "Payment is not confirmed. Production and fulfillment actions are locked for this order.");
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
