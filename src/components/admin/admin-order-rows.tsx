"use client";
import { formatOrderItemSummary, getPrimaryOrderAction } from "@/lib/admin-list-display";
import { type AdminOrderAction } from "@/lib/admin-order-actions";
import { formatOrderReference } from "@/lib/order-reference";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";
import dynamic from "next/dynamic";
import { OrderMobileField, QuickActionButton, StatusPill, canOperateOrder, formatStatus } from "./admin-order-fields";
import type { AdminOrdersWorkspaceOrder } from "./admin-orders-workspace-types";
import { AdminButton, AdminLinkButton } from "./admin-ui";
const OrderInlineEditor=dynamic(()=>import("./admin-order-inline-editor").then(m=>m.OrderInlineEditor),{loading:()=> <p role="status">Loading order controls...</p>});
export function OrderRow({
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
  const itemSummary = formatOrderItemSummary(order.items);
  const primaryAction = getPrimaryOrderAction(order);
  const canOperate = canOperateOrder(order);

  return (
    <>
      <tr className="border-b border-line last:border-b-0">
        <td className="px-4 py-4 align-top">
          <input type="checkbox" checked={selected} onChange={onToggleSelected} disabled={!canOperate} className="h-4 w-4 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Select ${itemSummary.title}`} />
        </td>
        <td className="px-4 py-4 align-top">
          <p className="max-w-[240px] truncate font-semibold text-ink" title={itemSummary.title}>{itemSummary.title}</p>
          <p className="mt-1 text-xs font-semibold text-muted">{itemSummary.count}</p>
          <p className="mt-1 font-mono text-xs text-muted">{formatOrderReference(order.checkoutSessionId || order.id)}</p>
        </td>
        <td className="px-4 py-4 align-top">
          <p className="max-w-[220px] truncate font-semibold text-ink" title={order.customerName}>{order.customerName}</p>
        </td>
        <td className="px-4 py-4 align-top font-semibold text-ink">
          {order.total}
          <div className="mt-2">
            <StatusPill tone={order.status === "paid" ? "ready" : "warning"}>{order.paymentStatus === "complimentary" ? "Complimentary" : formatStatus(order.status)}</StatusPill>
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
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction.kind === "action" ? (
              <QuickActionButton disabled={saving} onClick={() => onApplyAction(primaryAction.action)}>
                {primaryAction.label}
              </QuickActionButton>
            ) : (
              <StatusPill tone={primaryAction.tone}>{primaryAction.label}</StatusPill>
            )}
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
            <OrderInlineEditor order={order} saving={saving} canOperate={canOperate} onSave={onSave} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function OrderMobileCard({
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
  const itemSummary = formatOrderItemSummary(order.items);
  const primaryAction = getPrimaryOrderAction(order);
  const canOperate = canOperateOrder(order);

  return (
    <article className={selected ? "rounded-xl border border-brand bg-teal-50/40 p-4" : "rounded-xl border border-line bg-white p-4"}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onToggleSelected} disabled={!canOperate} className="mt-1 h-4 w-4 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Select ${itemSummary.title}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink" title={itemSummary.title}>{itemSummary.title}</p>
          <p className="mt-1 text-sm font-semibold text-muted">{itemSummary.count}</p>
          <p className="mt-1 font-mono text-xs text-muted">{formatOrderReference(order.checkoutSessionId || order.id)}</p>
          <p className="mt-2 truncate text-sm text-ink" title={order.customerName}>{order.customerName}</p>
        </div>
        <p className="shrink-0 font-semibold text-ink">{order.total}</p>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <OrderMobileField label="Payment"><StatusPill tone={order.status === "paid" ? "ready" : "warning"}>{order.paymentStatus === "complimentary" ? "Complimentary" : formatStatus(order.status)}</StatusPill></OrderMobileField>
        <OrderMobileField label="Production"><StatusPill tone={order.productionStatus === "completed" ? "ready" : order.productionStatus === "blocked" ? "warning" : "neutral"}>{formatStatus(order.productionStatus)}</StatusPill></OrderMobileField>
        <OrderMobileField label="Fulfillment"><StatusPill tone={order.shippingStatus === "shipped" || order.shippingStatus === "delivered" ? "ready" : order.shippingStatus === "blocked" ? "warning" : "neutral"}>{formatStatus(order.shippingStatus)}</StatusPill></OrderMobileField>
        <OrderMobileField label="Date">{order.createdAt}</OrderMobileField>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {primaryAction.kind === "action" ? (
          <QuickActionButton disabled={saving} onClick={() => onApplyAction(primaryAction.action)}>
            {primaryAction.label}
          </QuickActionButton>
        ) : (
          <StatusPill tone={primaryAction.tone}>{primaryAction.label}</StatusPill>
        )}
        <AdminButton type="button" onClick={onToggleEditor} className="min-h-8 px-3 py-1.5 text-xs" variant="outline">
          {editorOpen ? "Close" : "Edit"}
        </AdminButton>
        <AdminLinkButton href={`/admin/orders/${order.id}`} className="min-h-8 px-3 py-1.5 text-xs" variant="outline">
          View
        </AdminLinkButton>
      </div>
      {editorOpen ? (
        <div className="mt-4 border-t border-line pt-4">
          <OrderInlineEditor order={order} saving={saving} canOperate={canOperate} onSave={onSave} />
        </div>
      ) : null}
    </article>
  );
}
