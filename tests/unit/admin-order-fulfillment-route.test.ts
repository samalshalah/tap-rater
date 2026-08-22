import { afterEach, describe, expect, it, vi } from "vitest";

const validPayload = {
  productionStatus: "not_started",
  shippingStatus: "not_shipped",
  shippingMethod: "",
  shippingCarrier: "",
  trackingNumber: "",
  trackingUrl: "",
  internalNotes: "",
  adminFulfillmentNotes: "",
  markShipped: false
};

describe("admin order fulfillment API", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("passes intentional empty strings through to the fulfillment update layer", async () => {
    const updateOrderFulfillment = vi.fn().mockResolvedValue({ ok: true });

    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock("@/lib/orders", () => ({
      updateOrderFulfillment
    }));

    const { POST } = await import("@/app/api/admin/orders/[id]/fulfillment/route");
    const response = await POST(
      new Request("https://taprater.test/api/admin/orders/order-123/fulfillment", {
        method: "POST",
        body: JSON.stringify(validPayload)
      }),
      { params: Promise.resolve({ id: "order-123" }) }
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(updateOrderFulfillment).toHaveBeenCalledWith("order-123", {
      productionStatus: "not_started",
      shippingStatus: "not_shipped",
      shippingMethod: "",
      shippingCarrier: "",
      trackingNumber: "",
      trackingUrl: "",
      internalNotes: "",
      adminFulfillmentNotes: "",
      markShipped: false
    });
  });

  it("rejects invalid non-empty tracking URLs", async () => {
    const updateOrderFulfillment = vi.fn();

    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock("@/lib/orders", () => ({
      updateOrderFulfillment
    }));

    const { POST } = await import("@/app/api/admin/orders/[id]/fulfillment/route");
    const response = await POST(
      new Request("https://taprater.test/api/admin/orders/order-123/fulfillment", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, trackingUrl: "not-a-url" })
      }),
      { params: Promise.resolve({ id: "order-123" }) }
    );

    await expect(response.json()).resolves.toEqual({ error: "Fulfillment update is invalid." });
    expect(response.status).toBe(400);
    expect(updateOrderFulfillment).not.toHaveBeenCalled();
  });
});
