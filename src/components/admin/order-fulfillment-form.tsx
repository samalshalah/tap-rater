"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import type { OrderRecord } from "@/lib/orders";
import { createOrderFulfillmentPayload } from "@/lib/order-fulfillment-payload";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";
import { AdminAlert, AdminButton, AdminCard, AdminInput, AdminSelect, AdminTextarea } from "./admin-ui";

export function OrderFulfillmentForm({ order }: { order: OrderRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<OrderFulfillmentUpdateInput>({
    productionStatus: order.production_status,
    shippingStatus: order.shipping_status,
    shippingMethod: order.shipping_method ?? "",
    shippingCarrier: order.shipping_carrier ?? "",
    trackingNumber: order.tracking_number ?? "",
    trackingUrl: order.tracking_url ?? "",
    internalNotes: order.internal_notes,
    adminFulfillmentNotes: order.admin_fulfillment_notes,
    markShipped: false
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/fulfillment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createOrderFulfillmentPayload(form))
      });
      const data = (await response.json().catch(() => null)) as { error?: string; shippingEmail?: { sent: boolean; reason?: string } } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Fulfillment details could not be saved.");
      }

      const emailMessage = data?.shippingEmail
        ? data.shippingEmail.sent
          ? " Shipping notification sent."
          : ` Shipping notification was not sent: ${data.shippingEmail.reason ?? "unknown reason"}.`
        : "";
      setMessage(`Fulfillment details saved.${emailMessage}`);
      setForm((current) => ({ ...current, markShipped: false, shippingStatus: current.markShipped ? "shipped" : current.shippingStatus }));
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Fulfillment details could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <AdminCard title="Fulfillment operations" description="Update production and shipping state. Marking an order shipped with tracking sends the customer shipping notification once.">
      <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Production status
          <AdminSelect
            value={form.productionStatus}
            onChange={(event) => setForm((current) => ({ ...current, productionStatus: event.target.value as OrderFulfillmentUpdateInput["productionStatus"] }))}
            className="mt-2"
          >
            <option value="not_started">Not started</option>
            <option value="ready_for_production">Ready for production</option>
            <option value="in_production">In production</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </AdminSelect>
        </label>

        <label className="block text-sm font-semibold text-ink">
          Shipping status
          <AdminSelect
            value={form.shippingStatus}
            onChange={(event) => setForm((current) => ({ ...current, shippingStatus: event.target.value as OrderFulfillmentUpdateInput["shippingStatus"] }))}
            className="mt-2"
          >
            <option value="not_shipped">Not shipped</option>
            <option value="ready_to_ship">Ready to ship</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="blocked">Blocked</option>
          </AdminSelect>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="shippingMethod" label="Shipping method" value={form.shippingMethod} onChange={(value) => setForm((current) => ({ ...current, shippingMethod: value }))} />
        <TextField name="shippingCarrier" label="Carrier" value={form.shippingCarrier} onChange={(value) => setForm((current) => ({ ...current, shippingCarrier: value }))} />
        <TextField name="trackingNumber" label="Tracking number" value={form.trackingNumber} onChange={(value) => setForm((current) => ({ ...current, trackingNumber: value }))} />
        <TextField name="trackingUrl" label="Tracking URL" value={form.trackingUrl} onChange={(value) => setForm((current) => ({ ...current, trackingUrl: value }))} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextArea name="internalNotes" label="Internal notes" value={form.internalNotes} onChange={(value) => setForm((current) => ({ ...current, internalNotes: value }))} />
        <TextArea name="adminFulfillmentNotes" label="Admin fulfillment notes" value={form.adminFulfillmentNotes} onChange={(value) => setForm((current) => ({ ...current, adminFulfillmentNotes: value }))} />
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-md border border-line bg-gray-50 p-3 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={form.markShipped}
          onChange={(event) => setForm((current) => ({ ...current, markShipped: event.target.checked }))}
          className="h-4 w-4"
        />
        Mark shipped and set shipped date if empty
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-sm">
          {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
          {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
        </div>
        <AdminButton type="submit" disabled={isSaving} loading={isSaving} variant="primary">
          {isSaving ? "Saving..." : "Save fulfillment"}
        </AdminButton>
      </div>
      </div>
      </AdminCard>
    </form>
  );
}

function TextField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      <span className="flex items-center justify-between gap-3">
        {label}
        {value ? (
          <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-brand hover:text-ink">
            Clear
          </button>
        ) : null}
      </span>
      <AdminInput name={name} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2" />
    </label>
  );
}

function TextArea({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      <span className="flex items-center justify-between gap-3">
        {label}
        {value ? (
          <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-brand hover:text-ink">
            Clear
          </button>
        ) : null}
      </span>
      <AdminTextarea name={name} value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2" />
    </label>
  );
}
