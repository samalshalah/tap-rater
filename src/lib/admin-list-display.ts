import type { AdminOrderAction } from "@/lib/admin-order-actions";

export const adminProductListFilterLabels = [
  "Search",
  "Stand Type",
  "Business Use",
  "Platform",
  "Status",
  "Asset readiness",
  "Special solution"
] as const;

export const adminProductListColumnLabels = [
  "Image",
  "Product",
  "Type",
  "Uses",
  "Price",
  "Readiness",
  "Status",
  "Updated",
  "Actions"
] as const;

type OrderSummaryItem = {
  title?: string;
  quantity: number;
};

export function formatOrderItemSummary(items: OrderSummaryItem[]) {
  if (items.length === 0) {
    return { title: "No items", count: "0 items" };
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const primaryTitle = items[0]?.title ?? "Untitled item";
  const extraProductCount = Math.max(items.length - 1, 0);

  return {
    title: extraProductCount > 0 ? `${primaryTitle} + ${extraProductCount} more` : primaryTitle,
    count: `${totalQuantity} item${totalQuantity === 1 ? "" : "s"}`
  };
}

type OrderWorkflowState = {
  productionStatus: string;
  shippingStatus: string;
};

type PrimaryOrderAction =
  | { kind: "action"; action: AdminOrderAction; label: string }
  | { kind: "status"; label: string };

export function getPrimaryOrderAction(state: OrderWorkflowState): PrimaryOrderAction {
  if (state.shippingStatus === "delivered") {
    return { kind: "status" as const, label: "Delivered" };
  }

  if (state.shippingStatus === "shipped") {
    return { kind: "status" as const, label: "Shipped" };
  }

  if (state.productionStatus === "completed" && state.shippingStatus === "ready_to_ship") {
    return { kind: "action" as const, action: "mark_shipped" satisfies AdminOrderAction, label: "Shipped" };
  }

  if (state.productionStatus === "completed") {
    return { kind: "action" as const, action: "ready_to_ship" satisfies AdminOrderAction, label: "Ready ship" };
  }

  if (state.productionStatus === "ready_for_production") {
    return { kind: "action" as const, action: "in_production" satisfies AdminOrderAction, label: "In production" };
  }

  if (state.productionStatus === "in_production") {
    return { kind: "action" as const, action: "ready_to_ship" satisfies AdminOrderAction, label: "Ready ship" };
  }

  return { kind: "action" as const, action: "ready_for_production" satisfies AdminOrderAction, label: "Ready" };
}
