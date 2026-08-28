"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createAdminOrderActionPayload, type AdminOrderAction, type AdminOrderActionSource } from "@/lib/admin-order-actions";
import { createOrderFulfillmentPayload } from "@/lib/order-fulfillment-payload";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";
import { AdminAlert, AdminBadge, AdminButton, AdminCard, AdminInput, AdminLinkButton, AdminResponsiveTable, AdminSelect, AdminSummaryCard, AdminTextarea } from "./admin-ui";

export type AdminOrdersWorkspaceOrder = AdminOrderActionSource & {
  id: string;
  checkoutSessionId: string;
  customerName: string;
  email: string;
  items: AdminOrdersWorkspaceItem[];
  total: string;
  status: "pending_payment" | "paid" | "failed" | "canceled";
  paymentStatus: string;
  createdAt: string;
  fulfillmentBadges: Array<{ label: string; tone: "ready" | "warning" | "neutral" }>;
};

export type AdminOrdersWorkspaceItem = {
  key: string;
  title: string;
  quantity: number;
  sku: string;
  optionLabel: string;
  statusLabel: string;
  statusTone: "ready" | "warning" | "neutral";
};

type AdminOrdersWorkspaceProps = {
  orders: AdminOrdersWorkspaceOrder[];
  configured: boolean;
  initialFilter?: string;
};

const filterOptions = [
  ["all", "All"],
  ["paid", "Paid"],
  ["pending", "Pending"],
  ["production", "Needs production"],
  ["ready_to_ship", "Ready to ship"],
  ["shipped", "Shipped"],
  ["blocked", "Blocked"]
] as const;

type AdminOrdersFilter = (typeof filterOptions)[number][0];

const bulkActions: Array<{ value: AdminOrderAction; label: string }> = [
  { value: "ready_for_production", label: "Ready for production" },
  { value: "in_production", label: "In production" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "mark_shipped", label: "Mark shipped" },
  { value: "mark_delivered", label: "Mark delivered" },
  { value: "block_order", label: "Block order" }
];

export function AdminOrdersWorkspace({ orders, configured, initialFilter = "all" }: AdminOrdersWorkspaceProps) {
  const router = useRouter();
  const [orderRows, setOrderRows] = useState(orders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminOrdersFilter>(isAdminOrdersFilter(initialFilter) ? initialFilter : "all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<AdminOrderAction>("ready_for_production");
  const [openEditorId, setOpenEditorId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return orderRows.filter((order) => {
      const matchesSearch = !search || [
        order.checkoutSessionId,
        order.customerName,
        order.email,
        order.paymentStatus,
        order.items.map((item) => `${item.title} ${item.sku}`).join(" ")
      ].some((value) => value.toLowerCase().includes(search));

      if (!matchesSearch) return false;
      if (filter === "paid") return order.status === "paid";
      if (filter === "pending") return order.status === "pending_payment";
      if (filter === "production") return order.productionStatus !== "completed" && order.shippingStatus !== "shipped" && order.shippingStatus !== "delivered";
      if (filter === "ready_to_ship") return order.productionStatus === "completed" && order.shippingStatus === "ready_to_ship";
      if (filter === "shipped") return order.shippingStatus === "shipped" || order.shippingStatus === "delivered";
      if (filter === "blocked") return order.productionStatus === "blocked" || order.shippingStatus === "blocked";
      return true;
    });
  }, [filter, orderRows, query]);

  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every((order) => selectedIds.includes(order.id));

  async function applyAction(order: AdminOrdersWorkspaceOrder, action: AdminOrderAction) {
    await saveOrder(order, createAdminOrderActionPayload(order, action), actionLabel(action));
  }

  async function applyBulkAction() {
    const selectedOrders = orderRows.filter((order) => selectedIds.includes(order.id));
    if (selectedOrders.length === 0) return;

    setMessage(null);
    setError(null);
    for (const order of selectedOrders) {
      const result = await saveOrder(order, createAdminOrderActionPayload(order, bulkAction), actionLabel(bulkAction), false);
      if (!result) return;
    }
    setSelectedIds([]);
    setMessage(`${selectedOrders.length} order${selectedOrders.length === 1 ? "" : "s"} updated.`);
    router.refresh();
  }

  async function saveOrder(
    order: AdminOrdersWorkspaceOrder,
    payload: OrderFulfillmentUpdateInput,
    successLabel = "Order updated",
    refresh = true
  ) {
    setSavingIds((current) => [...current, order.id]);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/fulfillment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createOrderFulfillmentPayload(payload))
      });
      const data = (await response.json().catch(() => null)) as { error?: string; shippingEmail?: { sent: boolean; reason?: string } } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Order update failed.");
      }

      setOrderRows((current) =>
        current.map((candidate) =>
          candidate.id === order.id
            ? {
                ...candidate,
                productionStatus: payload.productionStatus,
                shippingStatus: payload.markShipped ? "shipped" : payload.shippingStatus,
                shippingMethod: payload.shippingMethod,
                shippingCarrier: payload.shippingCarrier,
                trackingNumber: payload.trackingNumber,
                trackingUrl: payload.trackingUrl,
                internalNotes: payload.internalNotes,
                adminFulfillmentNotes: payload.adminFulfillmentNotes
              }
            : candidate
        )
      );

      if (refresh) {
        const emailMessage = data?.shippingEmail
          ? data.shippingEmail.sent
            ? " Shipping notification sent."
            : ` Shipping notification was not sent: ${data.shippingEmail.reason ?? "unknown reason"}.`
          : "";
        setMessage(`${successLabel}.${emailMessage}`);
        router.refresh();
      }
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Order update failed.");
      return false;
    } finally {
      setSavingIds((current) => current.filter((id) => id !== order.id));
    }
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleOrders.some((order) => order.id === id));
      }
      return Array.from(new Set([...current, ...visibleOrders.map((order) => order.id)]));
    });
  }

  function toggleSelected(orderId: string) {
    setSelectedIds((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  }

  return (
    <div className="mt-8 space-y-5">
      {!configured ? (
        <AdminAlert tone="warning">
          Database persistence is not configured yet. Stripe checkout stays disabled until orders can be persisted.
        </AdminAlert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminSummaryCard label="Total orders" value={String(orderRows.length)} />
        <AdminSummaryCard label="Needs production" value={String(orderRows.filter((order) => order.productionStatus !== "completed").length)} />
        <AdminSummaryCard label="Ready to ship" value={String(orderRows.filter((order) => order.productionStatus === "completed" && order.shippingStatus === "ready_to_ship").length)} />
        <AdminSummaryCard label="Shipped / delivered" value={String(orderRows.filter((order) => order.shippingStatus === "shipped" || order.shippingStatus === "delivered").length)} />
      </div>

      <AdminCard>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block text-sm font-semibold text-ink">
            Search orders
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Customer, email, SKU, order id"
              className="mt-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={filter === value ? "rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase text-white" : "rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold uppercase text-ink"}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm font-semibold text-muted">
            Showing {visibleOrders.length} of {orderRows.length} orders. {selectedIds.length} selected.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AdminSelect
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value as AdminOrderAction)}
            >
              {bulkActions.map((action) => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </AdminSelect>
            <AdminButton
              type="button"
              onClick={applyBulkAction}
              disabled={selectedIds.length === 0 || savingIds.length > 0}
              loading={savingIds.length > 0}
              variant="primary"
            >
              Apply to selected
            </AdminButton>
          </div>
        </div>
        {message ? <AdminAlert className="mt-3" tone="success">{message}</AdminAlert> : null}
        {error ? <AdminAlert className="mt-3" tone="danger">{error}</AdminAlert> : null}
      </AdminCard>

      <AdminResponsiveTable
        table={
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
              <th className="px-4 py-3">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4" aria-label="Select all visible orders" />
              </th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Production</th>
              <th className="px-4 py-3">Shipping</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => {
              const saving = savingIds.includes(order.id);
              return (
                <OrderRow
                  key={order.id}
                  order={order}
                  saving={saving}
                  selected={selectedIds.includes(order.id)}
                  editorOpen={openEditorId === order.id}
                  onToggleSelected={() => toggleSelected(order.id)}
                  onToggleEditor={() => setOpenEditorId((current) => current === order.id ? null : order.id)}
                  onApplyAction={(action) => applyAction(order, action)}
                  onSave={(payload) => saveOrder(order, payload)}
                />
              );
            })}
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  No orders match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        }
        cards={
          visibleOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No orders match the current filters.</p>
          ) : (
            visibleOrders.map((order) => {
              const saving = savingIds.includes(order.id);
              return (
                <OrderMobileCard
                  key={order.id}
                  order={order}
                  saving={saving}
                  selected={selectedIds.includes(order.id)}
                  editorOpen={openEditorId === order.id}
                  onToggleSelected={() => toggleSelected(order.id)}
                  onToggleEditor={() => setOpenEditorId((current) => current === order.id ? null : order.id)}
                  onApplyAction={(action) => applyAction(order, action)}
                  onSave={(payload) => saveOrder(order, payload)}
                />
              );
            })
          )
        }
      />
    </div>
  );
}

function OrderRow({
  order,
  saving,
  selected,
  editorOpen,
  onToggleSelected,
  onToggleEditor,
  onApplyAction,
  onSave
}: {
  order: AdminOrdersWorkspaceOrder;
  saving: boolean;
  selected: boolean;
  editorOpen: boolean;
  onToggleSelected: () => void;
  onToggleEditor: () => void;
  onApplyAction: (action: AdminOrderAction) => void;
  onSave: (payload: OrderFulfillmentUpdateInput) => void;
}) {
  return (
    <>
      <tr className="border-b border-line last:border-b-0">
        <td className="px-4 py-4 align-top">
          <input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4" aria-label={`Select ${order.checkoutSessionId}`} />
        </td>
        <td className="px-4 py-4 align-top">
          <p className="max-w-[180px] truncate font-mono text-xs text-ink" title={order.checkoutSessionId}>{order.checkoutSessionId}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
        </td>
        <td className="px-4 py-4 align-top">
          <p className="max-w-[220px] truncate font-semibold text-ink" title={order.customerName}>{order.customerName}</p>
          <p className="max-w-[220px] truncate text-muted" title={order.email}>{order.email || "-"}</p>
        </td>
        <td className="px-4 py-4 align-top font-semibold text-ink">
          {order.total}
          <div className="mt-2">
            <StatusPill tone={order.status === "paid" ? "ready" : "warning"}>{formatStatus(order.status)}</StatusPill>
          </div>
        </td>
        <td className="px-4 py-4 align-top text-muted">{order.createdAt}</td>
        <td className="px-4 py-4 align-top">
          <StatusPill tone={order.productionStatus === "completed" ? "ready" : order.productionStatus === "blocked" ? "warning" : "neutral"}>
            {formatStatus(order.productionStatus)}
          </StatusPill>
        </td>
        <td className="px-4 py-4 align-top">
          <StatusPill tone={order.shippingStatus === "shipped" || order.shippingStatus === "delivered" ? "ready" : order.shippingStatus === "blocked" ? "warning" : "neutral"}>
            {formatStatus(order.shippingStatus)}
          </StatusPill>
        </td>
        <td className="px-4 py-4 align-top">
          <div className="flex flex-wrap gap-2">
            <QuickActionButton disabled={saving} onClick={() => onApplyAction("ready_for_production")}>Ready</QuickActionButton>
            <QuickActionButton disabled={saving} onClick={() => onApplyAction("ready_to_ship")}>Ready ship</QuickActionButton>
            <QuickActionButton disabled={saving} onClick={() => onApplyAction("mark_shipped")}>Shipped</QuickActionButton>
            <AdminButton type="button" onClick={onToggleEditor} className="min-h-8 px-3 py-1.5 text-xs" variant="outline">
              {editorOpen ? "Close" : "Edit"}
            </AdminButton>
            <AdminLinkButton href={`/admin/orders/${order.id}`} className="min-h-8 px-3 py-1.5 text-xs" variant="outline">
              View
            </AdminLinkButton>
          </div>
        </td>
      </tr>
      {editorOpen ? (
        <tr className="border-b border-line bg-gray-50">
          <td colSpan={8} className="px-4 py-4">
            <OrderInlineEditor order={order} saving={saving} onSave={onSave} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OrderInlineEditor({
  order,
  saving,
  onSave
}: {
  order: AdminOrdersWorkspaceOrder;
  saving: boolean;
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
          <SelectField label="Production" value={form.productionStatus} onChange={(value) => setForm((current) => ({ ...current, productionStatus: value as OrderFulfillmentUpdateInput["productionStatus"] }))}>
            <option value="not_started">Not started</option>
            <option value="ready_for_production">Ready for production</option>
            <option value="in_production">In production</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </SelectField>
          <SelectField label="Shipping" value={form.shippingStatus} onChange={(value) => setForm((current) => ({ ...current, shippingStatus: value as OrderFulfillmentUpdateInput["shippingStatus"] }))}>
            <option value="not_shipped">Not shipped</option>
            <option value="ready_to_ship">Ready to ship</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="blocked">Blocked</option>
          </SelectField>
          <TextField label="Shipping method" value={form.shippingMethod} onChange={(value) => setForm((current) => ({ ...current, shippingMethod: value }))} />
          <TextField label="Carrier" value={form.shippingCarrier} onChange={(value) => setForm((current) => ({ ...current, shippingCarrier: value }))} />
          <TextField label="Tracking number" value={form.trackingNumber} onChange={(value) => setForm((current) => ({ ...current, trackingNumber: value }))} />
          <TextField label="Tracking URL" value={form.trackingUrl} onChange={(value) => setForm((current) => ({ ...current, trackingUrl: value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextArea label="Internal notes" value={form.internalNotes} onChange={(value) => setForm((current) => ({ ...current, internalNotes: value }))} />
          <TextArea label="Fulfillment notes" value={form.adminFulfillmentNotes} onChange={(value) => setForm((current) => ({ ...current, adminFulfillmentNotes: value }))} />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={form.markShipped} onChange={(event) => setForm((current) => ({ ...current, markShipped: event.target.checked }))} className="h-4 w-4" />
            Set shipped date
          </label>
          <AdminButton type="button" disabled={saving} loading={saving} onClick={() => onSave(form)} className="w-full" variant="primary">
            {saving ? "Saving..." : "Save controls"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminSelect value={value} onChange={(event) => onChange(event.target.value)} className="mt-2">
        {children}
      </AdminSelect>
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminInput value={value} onChange={(event) => onChange(event.target.value)} className="mt-2" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminTextarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2" />
    </label>
  );
}

function QuickActionButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <AdminButton type="button" disabled={disabled} onClick={onClick} className="min-h-8 px-3 py-1.5 text-xs" variant="primary">
      {children}
    </AdminButton>
  );
}

function actionLabel(action: AdminOrderAction) {
  return bulkActions.find((candidate) => candidate.value === action)?.label ?? "Order updated";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "ready" | "warning" | "neutral" }) {
  return <AdminBadge tone={tone === "ready" ? "success" : tone === "warning" ? "warning" : "neutral"}>{children}</AdminBadge>;
}

function isAdminOrdersFilter(value: string): value is AdminOrdersFilter {
  return filterOptions.some(([filter]) => filter === value);
}

function OrderMobileCard({
  order,
  saving,
  selected,
  editorOpen,
  onToggleSelected,
  onToggleEditor,
  onApplyAction,
  onSave
}: {
  order: AdminOrdersWorkspaceOrder;
  saving: boolean;
  selected: boolean;
  editorOpen: boolean;
  onToggleSelected: () => void;
  onToggleEditor: () => void;
  onApplyAction: (action: AdminOrderAction) => void;
  onSave: (payload: OrderFulfillmentUpdateInput) => void;
}) {
  return (
    <article className={selected ? "rounded-xl border border-brand bg-teal-50/40 p-4" : "rounded-xl border border-line bg-white p-4"}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onToggleSelected} className="mt-1 h-4 w-4" aria-label={`Select ${order.checkoutSessionId}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink" title={order.customerName}>{order.customerName}</p>
          <p className="mt-1 truncate text-sm text-muted" title={order.email}>{order.email || "-"}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted" title={order.checkoutSessionId}>{order.checkoutSessionId}</p>
        </div>
        <p className="shrink-0 font-semibold text-ink">{order.total}</p>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <OrderMobileField label="Payment"><StatusPill tone={order.status === "paid" ? "ready" : "warning"}>{formatStatus(order.status)}</StatusPill></OrderMobileField>
        <OrderMobileField label="Production"><StatusPill tone={order.productionStatus === "completed" ? "ready" : order.productionStatus === "blocked" ? "warning" : "neutral"}>{formatStatus(order.productionStatus)}</StatusPill></OrderMobileField>
        <OrderMobileField label="Fulfillment"><StatusPill tone={order.shippingStatus === "shipped" || order.shippingStatus === "delivered" ? "ready" : order.shippingStatus === "blocked" ? "warning" : "neutral"}>{formatStatus(order.shippingStatus)}</StatusPill></OrderMobileField>
        <OrderMobileField label="Date">{order.createdAt}</OrderMobileField>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <QuickActionButton disabled={saving} onClick={() => onApplyAction("ready_for_production")}>Ready</QuickActionButton>
        <QuickActionButton disabled={saving} onClick={() => onApplyAction("ready_to_ship")}>Ready ship</QuickActionButton>
        <QuickActionButton disabled={saving} onClick={() => onApplyAction("mark_shipped")}>Shipped</QuickActionButton>
        <AdminButton type="button" onClick={onToggleEditor} className="min-h-8 px-3 py-1.5 text-xs" variant="outline">
          {editorOpen ? "Close" : "Edit"}
        </AdminButton>
        <AdminLinkButton href={`/admin/orders/${order.id}`} className="min-h-8 px-3 py-1.5 text-xs" variant="outline">
          View
        </AdminLinkButton>
      </div>
      {editorOpen ? (
        <div className="mt-4 border-t border-line pt-4">
          <OrderInlineEditor order={order} saving={saving} onSave={onSave} />
        </div>
      ) : null}
    </article>
  );
}

function OrderMobileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
      <span className="min-w-0 text-ink">{children}</span>
    </div>
  );
}
