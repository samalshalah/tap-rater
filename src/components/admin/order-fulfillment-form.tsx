"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import type { OrderRecord } from "@/lib/orders";
import { createOrderFulfillmentPayload } from "@/lib/order-fulfillment-payload";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";

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
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Fulfillment details could not be saved.");
      }

      setMessage("Fulfillment details saved.");
      setForm((current) => ({ ...current, markShipped: false, shippingStatus: current.markShipped ? "shipped" : current.shippingStatus }));
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Fulfillment details could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-line bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-ink">Fulfillment operations</h2>
        <p className="mt-1 text-sm text-muted">Update production and shipping state. This does not send customer email yet.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          Production status
          <select
            value={form.productionStatus}
            onChange={(event) => setForm((current) => ({ ...current, productionStatus: event.target.value as OrderFulfillmentUpdateInput["productionStatus"] }))}
            className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="not_started">Not started</option>
            <option value="ready_for_production">Ready for production</option>
            <option value="in_production">In production</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label className="block text-sm font-bold text-ink">
          Shipping status
          <select
            value={form.shippingStatus}
            onChange={(event) => setForm((current) => ({ ...current, shippingStatus: event.target.value as OrderFulfillmentUpdateInput["shippingStatus"] }))}
            className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="not_shipped">Not shipped</option>
            <option value="ready_to_ship">Ready to ship</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="blocked">Blocked</option>
          </select>
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

      <label className="flex items-center gap-3 rounded-md border border-line bg-gray-50 p-3 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={form.markShipped}
          onChange={(event) => setForm((current) => ({ ...current, markShipped: event.target.checked }))}
          className="h-4 w-4"
        />
        Mark shipped and set shipped date if empty
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="text-sm">
          {message ? <p className="font-bold text-brand">{message}</p> : null}
          {error ? <p className="font-bold text-red-600">{error}</p> : null}
        </div>
        <button type="submit" disabled={isSaving} className="rounded-md bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          {isSaving ? "Saving..." : "Save fulfillment"}
        </button>
      </div>
    </form>
  );
}

function TextField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-ink">
      <span className="flex items-center justify-between gap-3">
        {label}
        {value ? (
          <button type="button" onClick={() => onChange("")} className="text-xs font-black text-brand hover:text-ink">
            Clear
          </button>
        ) : null}
      </span>
      <input name={name} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm" />
    </label>
  );
}

function TextArea({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-ink">
      <span className="flex items-center justify-between gap-3">
        {label}
        {value ? (
          <button type="button" onClick={() => onChange("")} className="text-xs font-black text-brand hover:text-ink">
            Clear
          </button>
        ) : null}
      </span>
      <textarea name={name} value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm" />
    </label>
  );
}
