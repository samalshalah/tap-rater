import { describe, expect, it } from "vitest";
import { adminProductListColumnLabels, adminProductListFilterLabels, formatOrderItemSummary, getPrimaryOrderAction } from "@/lib/admin-list-display";
import type { AdminOrdersWorkspaceItem } from "@/components/admin/admin-orders-workspace";

function item(overrides: Partial<AdminOrdersWorkspaceItem> = {}): AdminOrdersWorkspaceItem {
  return {
    key: "line-1",
    title: "Google Review Stand",
    quantity: 1,
    sku: "GRS",
    optionLabel: "Standard",
    statusLabel: "Ready",
    statusTone: "ready",
    ...overrides
  };
}

describe("admin list UI display rules", () => {
  it("keeps destination metadata out of the products list columns and filters", () => {
    expect(adminProductListColumnLabels).not.toContain("Destination");
    expect(adminProductListFilterLabels).not.toContain("Destination mode");
  });

  it("keeps product options out of the products list columns", () => {
    expect(adminProductListColumnLabels).not.toContain("Options");
  });

  it("summarizes one order item for the orders list", () => {
    expect(formatOrderItemSummary([item()])).toEqual({
      title: "Google Review Stand",
      count: "1 item"
    });
  });

  it("summarizes multiple order items without exposing a raw order id", () => {
    const summary = formatOrderItemSummary([
      item(),
      item({ key: "line-2", title: "Yelp Review Stand", quantity: 1 }),
      item({ key: "line-3", title: "Facebook Review Stand", quantity: 1 })
    ]);

    expect(summary).toEqual({
      title: "Google Review Stand + 2 more",
      count: "3 items"
    });
    expect(summary.title).not.toContain("manual_");
  });

  it("chooses one order action from the current workflow state", () => {
    expect(getPrimaryOrderAction({ productionStatus: "not_started", shippingStatus: "not_shipped" })).toMatchObject({
      kind: "action",
      action: "ready_for_production",
      label: "Ready"
    });
    expect(getPrimaryOrderAction({ productionStatus: "ready_for_production", shippingStatus: "not_shipped" })).toMatchObject({
      kind: "action",
      action: "in_production",
      label: "In production"
    });
    expect(getPrimaryOrderAction({ productionStatus: "completed", shippingStatus: "ready_to_ship" })).toMatchObject({
      kind: "action",
      action: "mark_shipped",
      label: "Shipped"
    });
    expect(getPrimaryOrderAction({ productionStatus: "completed", shippingStatus: "shipped" })).toEqual({
      kind: "status",
      label: "Shipped"
    });
  });
});
