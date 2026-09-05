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
const validId = "11111111-1111-4111-8111-111111111111";

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
      new Request(`https://taprater.test/api/admin/orders/${validId}/fulfillment`, {
        method: "POST",
        body: JSON.stringify(validPayload)
      }),
      { params: Promise.resolve({ id: validId }) }
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(updateOrderFulfillment).toHaveBeenCalledWith(validId, {
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
      new Request(`https://taprater.test/api/admin/orders/${validId}/fulfillment`, {
        method: "POST",
        body: JSON.stringify({ ...validPayload, trackingUrl: "not-a-url" })
      }),
      { params: Promise.resolve({ id: validId }) }
    );

    await expect(response.json()).resolves.toEqual({ error: "Fulfillment update is invalid." });
    expect(response.status).toBe(400);
    expect(updateOrderFulfillment).not.toHaveBeenCalled();
  });

  it("requires admin authentication", async () => {
    const updateOrderFulfillment = vi.fn();

    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }))
    }));
    vi.doMock("@/lib/orders", () => ({ updateOrderFulfillment }));

    const { POST } = await import("@/app/api/admin/orders/[id]/fulfillment/route");
    const response = await POST(
      new Request(`https://taprater.test/api/admin/orders/${validId}/fulfillment`, {
        method: "POST",
        body: JSON.stringify(validPayload)
      }),
      { params: Promise.resolve({ id: validId }) }
    );

    expect(response.status).toBe(401);
    expect(updateOrderFulfillment).not.toHaveBeenCalled();
  });

  it("rejects malformed order identifiers", async () => {
    const updateOrderFulfillment = vi.fn();

    vi.doMock("@/lib/admin-auth", () => ({ requireAdminApi: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/orders", () => ({ updateOrderFulfillment }));

    const { POST } = await import("@/app/api/admin/orders/[id]/fulfillment/route");
    const response = await POST(
      new Request("https://taprater.test/api/admin/orders/order-123/fulfillment", {
        method: "POST",
        body: JSON.stringify(validPayload)
      }),
      { params: Promise.resolve({ id: "order-123" }) }
    );

    expect(response.status).toBe(400);
    expect(updateOrderFulfillment).not.toHaveBeenCalled();
  });

  it("forwards lifecycle conflict status codes", async () => {
    const updateOrderFulfillment = vi.fn().mockResolvedValue({
      ok: false,
      error: "Fulfillment cannot advance until payment is confirmed.",
      status: 409
    });

    vi.doMock("@/lib/admin-auth", () => ({ requireAdminApi: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/orders", () => ({ updateOrderFulfillment }));

    const { POST } = await import("@/app/api/admin/orders/[id]/fulfillment/route");
    const response = await POST(
      new Request(`https://taprater.test/api/admin/orders/${validId}/fulfillment`, {
        method: "POST",
        body: JSON.stringify(validPayload)
      }),
      { params: Promise.resolve({ id: validId }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Fulfillment cannot advance until payment is confirmed." });
  });
});
