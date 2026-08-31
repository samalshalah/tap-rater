import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBadge, AdminCard, AdminLinkButton, AdminSoftPanel } from "@/components/admin/admin-ui";
import { OrderFulfillmentForm } from "@/components/admin/order-fulfillment-form";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminOrderById, getOrderLineItemProductionSummary, type OrderLineItem } from "@/lib/orders";
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
              <Field label="Payment" value={order.status.replace("_", " ")} />
              <Field label="Payment status" value={order.payment_status} />
              <Field label="Production" value={order.production_status.replaceAll("_", " ")} />
              <Field label="Shipping" value={order.shipping_status.replaceAll("_", " ")} />
              <Field label="Shipped at" value={order.shipped_at ? new Date(order.shipped_at).toLocaleString() : null} />
              <Field label="Tracking" value={order.tracking_number} />
              <Field label="Tracking URL" value={order.tracking_url} link />
            </InfoCard>
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
        <Field label="Proof confirmed" value={summary.proofConfirmed ? "Yes" : "No"} />
        <Field label="Proof approved at" value={readSetupString(item.setup, "proofApprovedAt")} />
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
    </AdminSoftPanel>
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
