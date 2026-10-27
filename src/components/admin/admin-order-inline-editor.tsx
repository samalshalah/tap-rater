"use client";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";
import { useState } from "react";
import { SelectField, StatusPill, TextArea, TextField } from "./admin-order-fields";
import type { AdminOrdersWorkspaceOrder } from "./admin-orders-workspace-types";
import { AdminAlert, AdminButton, AdminCard } from "./admin-ui";
export function OrderInlineEditor({
  order,
  saving,
  canOperate,
  onSave
}: {
  order: AdminOrdersWorkspaceOrder;
  saving: boolean;
  canOperate: boolean;
  onSave: (payload: OrderFulfillmentUpdateInput) => void;
}) {
  const [form, setForm] = useState<OrderFulfillmentUpdateInput>({
    productionStatus: order.productionStatus,
    shippingStatus: order.shippingStatus,
    shippingMethod: order.shippingMethod,
    shippingCarrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    internalNotes: order.internalNotes,
    adminFulfillmentNotes: order.adminFulfillmentNotes,
    markShipped: false
  });

  return (
    <div className="space-y-4">
      {!canOperate ? (
        <AdminAlert tone="warning">{order.paymentStatus?.includes("refund") ? "This order has a refund. Production and shipping are locked." : "Payment must be confirmed before production or shipping status can advance."} Internal notes can still be saved.</AdminAlert>
      ) : null}
      <AdminCard title="Order items" className="p-4">
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {order.items.map((item) => (
            <div key={item.key} className="rounded-md border border-line p-3">
              <p className="font-semibold text-ink">{item.quantity} x {item.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase text-muted">SKU {item.sku}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusPill tone="neutral">{item.optionLabel}</StatusPill>
                <StatusPill tone={item.statusTone}>{item.statusLabel}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Production" value={form.productionStatus} disabled={!canOperate} onChange={(value) => setForm((current) => ({ ...current, productionStatus: value as OrderFulfillmentUpdateInput["productionStatus"] }))}>
            <option value="not_started">Not started</option>
            <option value="ready_for_production">Ready for production</option>
            <option value="in_production">In production</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </SelectField>
          <SelectField label="Shipping" value={form.shippingStatus} disabled={!canOperate} onChange={(value) => setForm((current) => ({ ...current, shippingStatus: value as OrderFulfillmentUpdateInput["shippingStatus"] }))}>
            <option value="not_shipped">Not shipped</option>
            <option value="ready_to_ship">Ready to ship</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="blocked">Blocked</option>
          </SelectField>
          <TextField label="Shipping method" value={form.shippingMethod} disabled={!canOperate} onChange={(value) => setForm((current) => ({ ...current, shippingMethod: value }))} />
          <TextField label="Carrier" value={form.shippingCarrier} disabled={!canOperate} onChange={(value) => setForm((current) => ({ ...current, shippingCarrier: value }))} />
          <TextField label="Tracking number" value={form.trackingNumber} disabled={!canOperate} onChange={(value) => setForm((current) => ({ ...current, trackingNumber: value }))} />
          <TextField label="Tracking URL" value={form.trackingUrl} disabled={!canOperate} onChange={(value) => setForm((current) => ({ ...current, trackingUrl: value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextArea label="Internal notes" value={form.internalNotes} onChange={(value) => setForm((current) => ({ ...current, internalNotes: value }))} />
          <TextArea label="Fulfillment notes" value={form.adminFulfillmentNotes} onChange={(value) => setForm((current) => ({ ...current, adminFulfillmentNotes: value }))} />
        </div>
        <div>
          <AdminButton type="button" disabled={saving} loading={saving} onClick={() => onSave(form)} className="w-full" variant="primary">
            {saving ? "Saving..." : "Save controls"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
