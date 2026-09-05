import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  refundAdminOrder: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/lib/order-refunds", () => ({ refundAdminOrder: mocks.refundAdminOrder }));

import { POST } from "@/app/api/admin/orders/[id]/refund/route";

const validId = "11111111-1111-4111-8111-111111111111";

describe("admin order refund route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.refundAdminOrder.mockReset();
    mocks.refundAdminOrder.mockResolvedValue({ ok: true, refundId: "re_test_1", alreadyRefunded: false });
  });

  it("requires admin authentication", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(401);
    expect(mocks.refundAdminOrder).not.toHaveBeenCalled();
  });

  it("requires a valid UUID and explicit refund confirmation", async () => {
    const badId = await POST(createRequest(), { params: Promise.resolve({ id: "order-1" }) });
    const unconfirmed = await POST(createRequest({ confirmation: "refund" }), { params: Promise.resolve({ id: validId }) });

    expect(badId.status).toBe(400);
    expect(unconfirmed.status).toBe(400);
    expect(mocks.refundAdminOrder).not.toHaveBeenCalled();
  });

  it("refunds a valid order and forwards service failures", async () => {
    const success = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ ok: true, refundId: "re_test_1", alreadyRefunded: false });
    expect(mocks.refundAdminOrder).toHaveBeenCalledWith(validId);

    mocks.refundAdminOrder.mockResolvedValue({ ok: false, error: "Only paid orders can be refunded.", status: 409 });
    const held = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });
    expect(held.status).toBe(409);
  });
});

function createRequest(body: unknown = { confirmation: "REFUND" }) {
  return new Request(`https://taprater.com/api/admin/orders/${validId}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}
