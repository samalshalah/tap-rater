import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  applyAdminOrderProductionAction: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/lib/orders", () => ({ applyAdminOrderProductionAction: mocks.applyAdminOrderProductionAction }));

import { POST } from "@/app/api/admin/orders/[id]/production-action/route";

const validId = "11111111-1111-4111-8111-111111111111";

describe("admin order production action route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.applyAdminOrderProductionAction.mockReset();
    mocks.applyAdminOrderProductionAction.mockResolvedValue({
      ok: true,
      order: { production_status: "completed" }
    });
  });

  it("requires admin authentication", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(401);
    expect(mocks.applyAdminOrderProductionAction).not.toHaveBeenCalled();
  });

  it("rejects malformed identifiers and actions", async () => {
    const badId = await POST(createRequest(), { params: Promise.resolve({ id: "order-1" }) });
    const badAction = await POST(createRequest({ action: "ship_order" }), { params: Promise.resolve({ id: validId }) });

    expect(badId.status).toBe(400);
    expect(badAction.status).toBe(400);
    expect(mocks.applyAdminOrderProductionAction).not.toHaveBeenCalled();
  });

  it("runs a valid action and forwards payment holds", async () => {
    const success = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(success.status).toBe(200);
    expect(mocks.applyAdminOrderProductionAction).toHaveBeenCalledWith(validId, {
      action: "approve_proof_manually",
      note: "Approved by staff."
    });

    mocks.applyAdminOrderProductionAction.mockResolvedValue({
      ok: false,
      error: "Production actions are unavailable until payment is confirmed.",
      status: 409
    });
    const held = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });
    expect(held.status).toBe(409);
  });
});

function createRequest(body: unknown = { action: "approve_proof_manually", note: "Approved by staff." }) {
  return new Request(`https://taprater.com/api/admin/orders/${validId}/production-action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}
