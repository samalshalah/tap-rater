import { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";

const { getOrder } = vi.hoisted(() => ({ getOrder: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/components/admin/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/admin/order-fulfillment-form", () => ({ OrderFulfillmentForm: () => null }));
vi.mock("@/components/admin/order-production-actions", () => ({ OrderProductionActions: () => null }));
vi.mock("@/components/admin/order-refund-form", () => ({ OrderRefundForm: () => null }));
vi.mock("@/lib/orders", async original => ({
  ...await original<typeof import("@/lib/orders")>(),
  getAdminOrderById: getOrder,
  getOrderProductionBlockers: () => []
}));

describe("admin order detail wrapping", () => {
  it("maps production previews and downloads to the authenticated order line, ignoring legacy public URLs", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    getOrder.mockResolvedValue({ configured: true, order: {
      id, stripe_checkout_session_id: "cs_test", total_cents: 4900, shipping_amount_cents: 0,
      status: "paid", payment_status: "paid", production_status: "not_started", shipping_status: "not_shipped",
      line_items_json: [{ productId: "google", title: "Google Review Stand", sku: "GRS-BR", quantity: 1,
        optionId: "branded_qr_direct", unitAmountCents: 4900, lineSubtotalCents: 4900, proofApproved: true,
        setup: { productionArtwork: { status: "generated", format: "svg", contentType: "image/svg+xml", url: "https://public-bucket.example/private.svg", storageKey: "products/google/production_artwork/cs-test/line-1-0123456789abcdef.svg",
          widthPx: 1278, heightPx: 1949, widthIn: 4.26, heightIn: 6.4967, dpi: 300 } } }]
    } });
    const html = renderToStaticMarkup(await AdminOrderDetailPage({ params: Promise.resolve({ id }) }));
    expect(html).toContain(`href="/api/admin/orders/${id}/artwork/0"`);
    expect(html).toContain(`src="/api/admin/orders/${id}/artwork/0?preview=1"`);
    expect(html).toContain("Download production artwork");
    expect(html).not.toContain("public-bucket.example");
    expect(html).not.toContain("/api/media/product/products/google/production_artwork");
  });

  it("keeps the full long checkout reference inside a shrinkable header", async () => {
    const sessionId = `cs_test_${"a".repeat(120)}`;
    getOrder.mockResolvedValue({ configured: true, order: {
      id: "qa-order", customer_name: "A long customer business name", email: "qa@example.com",
      stripe_checkout_session_id: sessionId, total_cents: 8268, shipping_amount_cents: 0,
      status: "paid", payment_status: "paid", production_status: "not_started", shipping_status: "not_shipped",
      line_items_json: [], customer_details_json: {}, shipping_address_json: {}
    } });
    const html = renderToStaticMarkup(await AdminOrderDetailPage({ params: Promise.resolve({ id: "qa-order" }) }));
    expect(html).toContain('class="min-w-0 flex-1"');
    expect(html).toContain(`class="mt-2 break-all font-mono text-xs text-muted">${sessionId}</p>`);
    expect(html).toContain("tr-admin-title mt-2 break-words");
    expect(html).toContain("xl:grid-cols-[minmax(0,1fr)_420px]");
    expect(html).toContain("$82.68");
  });
});
