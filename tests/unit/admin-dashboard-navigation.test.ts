import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminOrdersWorkspace, type AdminOrdersWorkspaceOrder } from "@/components/admin/admin-orders-workspace";
import { AdminSummaryCard } from "@/components/admin/admin-ui";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const base: AdminOrdersWorkspaceOrder = {
  id: "order-1", checkoutSessionId: "cs_test_example", customerName: "Production customer", email: "test@example.com",
  items: [], total: "$39.00", status: "paid", paymentStatus: "paid", createdAt: "Today",
  fulfillmentBadges: [], productionStatus: "completed", shippingStatus: "not_shipped",
  shippingMethod: "", shippingCarrier: "", trackingNumber: "", trackingUrl: "", internalNotes: "", adminFulfillmentNotes: ""
};
function render(filter: string, overrides: Partial<AdminOrdersWorkspaceOrder> = {}) {
  return renderToStaticMarkup(createElement(AdminOrdersWorkspace, { configured: true, initialFilter: filter, orders: [{ ...base, ...overrides }] }));
}
describe("dashboard destinations", () => {
  it("renders the whole summary as a native link", () => {
    const html = renderToStaticMarkup(createElement(AdminSummaryCard, { label: "Ready to ship", value: "2", href: "/admin/orders?filter=ready_to_ship" }));
    expect(html).toMatch(/^<a .*href="\/admin\/orders\?filter=ready_to_ship"/);
    expect(html).toContain("Ready to ship");
  });
  it("includes completed orders that still have artwork warnings in production", () => {
    expect(render("production", { hasProductionWarnings: true })).toContain("Production customer");
    expect(render("production")).not.toContain("Production customer");
  });
  it("limits artwork failures to unshipped paid orders", () => {
    expect(render("artwork_failures", { hasArtworkFailure: true })).toContain("Production customer");
    expect(render("artwork_failures", { hasArtworkFailure: true, paymentStatus: "refunded" })).not.toContain("Production customer");
    expect(render("artwork_failures", { hasArtworkFailure: true, shippedAt: "2026-10-10" })).not.toContain("Production customer");
  });
  it("excludes unpaid orders from ready to ship", () => {
    expect(render("ready_to_ship", { shippingStatus: "ready_to_ship" })).toContain("Production customer");
    expect(render("ready_to_ship", { shippingStatus: "ready_to_ship", status: "pending_payment", paymentStatus: "unpaid" })).not.toContain("Production customer");
  });
});
