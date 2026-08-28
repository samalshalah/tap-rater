import { describe, expect, it } from "vitest";
import { adminProductListColumnLabels, adminProductListFilterLabels, formatOrderItemSummary } from "@/lib/admin-list-display";
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
});
