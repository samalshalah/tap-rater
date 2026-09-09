import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/admin/page";

const { getAdminOrders } = vi.hoisted(() => ({ getAdminOrders: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/admin-products", () => ({ getAdminProducts: async () => [] }));
vi.mock("@/lib/admin-navigation", () => ({ adminNavigationGroups: [] }));
vi.mock("@/components/admin/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/admin/admin-ui", () => ({
  AdminAlert: () => null,
  AdminCard: () => null,
  AdminSummaryCard: ({ label, value }: { label: string; value: string }) => createElement("p", null, `${label}: ${value}`)
}));
vi.mock("@/lib/orders", () => ({
  getAdminOrders,
  getOrderLineItemProductionSummary: (item: { failed?: boolean }) => ({ warnings: [], productionArtwork: { status: item.failed ? "generation_failed" : "ready" } })
}));

const paid = { status: "paid", payment_status: "paid", production_status: "ready_for_production", shipping_status: "not_shipped", shipped_at: null, line_items_json: [] };
beforeEach(() => vi.clearAllMocks());
async function counts(orders: unknown[]) {
  getAdminOrders.mockResolvedValue({ configured: true, orders });
  return renderToStaticMarkup(await AdminPage());
}

describe("admin dashboard actionable counts", () => {
  it("excludes unpaid, manual, canceled, failed, and refunded work", async () => {
    const html = await counts([
      paid,
      ...["unpaid", "manual_unpaid", "expired"].map(payment_status => ({ ...paid, status: "pending_payment", payment_status })),
      ...["canceled", "failed"].map(status => ({ ...paid, status })),
      ...["refunded", "partially_refunded"].map(payment_status => ({ ...paid, payment_status }))
    ]);
    expect(html).toContain("Needs production: 1");
  });
  it("excludes shipped, delivered, and blocked-after-shipment work", async () => {
    const html = await counts([
      paid,
      ...["shipped", "delivered"].map(shipping_status => ({ ...paid, shipping_status })),
      { ...paid, shipping_status: "blocked", shipped_at: "2026-09-08T13:51:05Z" }
    ]);
    expect(html).toContain("Needs production: 1");
  });
  it("counts only actionable artwork failures", async () => {
    const failed = { ...paid, line_items_json: [{ failed: true }] };
    const html = await counts([failed, { ...failed, payment_status: "refunded" }, { ...failed, shipping_status: "shipped" }]);
    expect(html).toContain("Artwork failures: 1");
  });
  it("counts only paid unshipped orders ready to ship", async () => {
    const ready = { ...paid, production_status: "completed", shipping_status: "ready_to_ship" };
    const html = await counts([ready, { ...ready, payment_status: "refunded" }, { ...ready, status: "pending_payment", payment_status: "unpaid" }]);
    expect(html).toContain("Ready to ship: 1");
    expect(html).toContain("Needs production: 0");
  });
  it("honors confirmed payment during order-status reconciliation", async () => {
    expect(await counts([{ ...paid, status: "pending_payment" }])).toContain("Needs production: 1");
  });
});
