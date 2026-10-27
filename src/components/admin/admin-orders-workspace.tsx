"use client";
import { actionLabel, canOperateOrder, isAdminOrdersFilter } from "./admin-order-fields";
import { OrderMobileCard, OrderRow } from "./admin-order-rows";
import type { AdminOrdersFilter, AdminOrdersWorkspaceOrder, AdminOrdersWorkspaceProps } from "./admin-orders-workspace-types";
import { bulkActions, filterOptions } from "./admin-orders-workspace-types";
export type { AdminOrdersWorkspaceItem, AdminOrdersWorkspaceOrder } from "./admin-orders-workspace-types";

import { createAdminOrderActionPayload, type AdminOrderAction } from "@/lib/admin-order-actions";
import { createOrderFulfillmentPayload } from "@/lib/order-fulfillment-payload";
import { formatOrderReference } from "@/lib/order-reference";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminAlert, AdminButton, AdminCard, AdminInput, AdminResponsiveTable, AdminSelect, AdminSummaryCard } from "./admin-ui";

export function AdminOrdersWorkspace({ orders, configured, initialFilter = "all" }: AdminOrdersWorkspaceProps) {
  const router = useRouter();
  const [orderRows, setOrderRows] = useState(orders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminOrdersFilter>(isAdminOrdersFilter(initialFilter) ? initialFilter : "all");
  const [mobileQuery, setMobileQuery] = useState(query);
  const [mobileFilter, setMobileFilter] = useState<AdminOrdersFilter>(filter);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<AdminOrderAction>("ready_for_production");
  const [openEditorId, setOpenEditorId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMobileQuery(query);
    setMobileFilter(filter);
  }, [filter, query]);

  useEffect(() => {
    setFilter(isAdminOrdersFilter(initialFilter) ? initialFilter : "all");
  }, [initialFilter]);

  const visibleOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return orderRows.filter((order) => {
      const matchesSearch = !search || [
        order.checkoutSessionId,
        formatOrderReference(order.checkoutSessionId || order.id),
        order.customerName,
        order.email,
        order.paymentStatus,
        order.items.map((item) => `${item.title} ${item.sku}`).join(" ")
      ].some((value) => value.toLowerCase().includes(search));

      if (!matchesSearch) return false;
      if (filter === "paid") return order.status === "paid" && order.paymentStatus !== "complimentary";
      if (filter === "complimentary") return order.paymentStatus === "complimentary";
      if (filter === "pending") return order.status === "pending_payment";
      const productionEligible = canOperateOrder(order) && !order.shippedAt && order.shippingStatus !== "shipped" && order.shippingStatus !== "delivered";
      if (filter === "production") return productionEligible && (order.productionStatus !== "completed" || order.hasProductionWarnings || order.hasArtworkFailure);
      if (filter === "artwork_failures") return productionEligible && order.hasArtworkFailure;
      if (filter === "ready_to_ship") return productionEligible && order.productionStatus === "completed" && order.shippingStatus === "ready_to_ship";
      if (filter === "shipped") return order.shippingStatus === "shipped" || order.shippingStatus === "delivered";
      if (filter === "blocked") return order.productionStatus === "blocked" || order.shippingStatus === "blocked";
      return true;
    });
  }, [filter, orderRows, query]);

  const selectableVisibleOrders = visibleOrders.filter(canOperateOrder);
  const allVisibleSelected = selectableVisibleOrders.length > 0 && selectableVisibleOrders.every((order) => selectedIds.includes(order.id));

  async function applyAction(order: AdminOrdersWorkspaceOrder, action: AdminOrderAction) {
    await saveOrder(order, createAdminOrderActionPayload(order, action), actionLabel(action));
  }

  async function applyBulkAction() {
    const selectedOrders = orderRows.filter((order) => selectedIds.includes(order.id) && canOperateOrder(order));
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
      return Array.from(new Set([...current, ...selectableVisibleOrders.map((order) => order.id)]));
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

      <div className="lg:hidden">
        <details className="group tr-admin-card p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </span>
            <span className="text-xs uppercase tracking-[0.04em] text-muted group-open:hidden">Open</span>
            <span className="hidden text-xs uppercase tracking-[0.04em] text-muted group-open:inline">Close</span>
          </summary>
          <div className="mt-3 grid gap-3">
            <label className="block text-sm font-semibold text-ink">
              Search orders
              <AdminInput
                value={mobileQuery}
                onChange={(event) => setMobileQuery(event.target.value)}
                placeholder="Customer, SKU, product"
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Order status
              <AdminSelect value={mobileFilter} onChange={(event) => setMobileFilter(event.target.value as AdminOrdersFilter)} className="mt-2">
                {filterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </AdminSelect>
            </label>
            <AdminButton
              type="button"
              variant="primary"
              onClick={() => {
                setQuery(mobileQuery);
                setFilter(mobileFilter);
              }}
            >
              Apply filters
            </AdminButton>
          </div>
        </details>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <AdminSummaryCard label="Total orders" value={String(orderRows.length)} />
        <AdminSummaryCard label="Payment holds" value={String(orderRows.filter((order) => !canOperateOrder(order)).length)} />
        <AdminSummaryCard label="Needs production" value={String(orderRows.filter((order) => canOperateOrder(order) && order.productionStatus !== "completed").length)} />
        <AdminSummaryCard label="Ready to ship" value={String(orderRows.filter((order) => order.productionStatus === "completed" && order.shippingStatus === "ready_to_ship").length)} />
        <AdminSummaryCard label="Shipped / delivered" value={String(orderRows.filter((order) => order.shippingStatus === "shipped" || order.shippingStatus === "delivered").length)} />
      </div>

      <AdminCard className="hidden lg:block p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="w-full max-w-sm">
            <span className="sr-only">Search orders</span>
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders: customer, SKU, product"
            />
          </label>
          <label className="w-44">
            <span className="sr-only">Order status</span>
            <AdminSelect value={filter} onChange={(event) => setFilter(event.target.value as AdminOrdersFilter)}>
              {filterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AdminSelect>
          </label>
          <p className="ml-auto text-xs text-muted" aria-live="polite">
            Showing {visibleOrders.length} of {orderRows.length} orders. {selectedIds.length} selected.
          </p>
        </div>

        {selectedIds.length > 0 ? <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3">
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
        </div> : null}
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
              <th className="px-4 py-3">Items</th>
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
