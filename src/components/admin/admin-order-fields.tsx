"use client";
import { type AdminOrderAction } from "@/lib/admin-order-actions";
import { canAdvanceOrderFulfillment } from "@/lib/order-fulfillment-rules";
import type { ReactNode } from "react";
import type { AdminOrdersFilter, AdminOrdersWorkspaceOrder } from "./admin-orders-workspace-types";
import { bulkActions, filterOptions } from "./admin-orders-workspace-types";
import { AdminBadge, AdminButton, AdminInput, AdminSelect, AdminTextarea } from "./admin-ui";
export function SelectField({ label, value, disabled = false, onChange, children }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminSelect value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-2">
        {children}
      </AdminSelect>
    </label>
  );
}

export function TextField({ label, value, disabled = false, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminInput value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-2" />
    </label>
  );
}

export function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminTextarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2" />
    </label>
  );
}

export function QuickActionButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <AdminButton type="button" disabled={disabled} onClick={onClick} className="min-h-8 px-3 py-1.5 text-xs" variant="primary">
      {children}
    </AdminButton>
  );
}

export function actionLabel(action: AdminOrderAction) {
  return bulkActions.find((candidate) => candidate.value === action)?.label ?? "Order updated";
}

export function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export function StatusPill({ children, tone }: { children: ReactNode; tone: "ready" | "warning" | "neutral" }) {
  return <AdminBadge tone={tone === "ready" ? "success" : tone === "warning" ? "warning" : "neutral"}>{children}</AdminBadge>;
}

export function isAdminOrdersFilter(value: string): value is AdminOrdersFilter {
  return filterOptions.some(([filter]) => filter === value);
}

export function OrderMobileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
      <span className="min-w-0 text-ink">{children}</span>
    </div>
  );
}

export function canOperateOrder(order: Pick<AdminOrdersWorkspaceOrder, "status" | "paymentStatus">) {
  return canAdvanceOrderFulfillment({ status: order.status, payment_status: order.paymentStatus });
}
