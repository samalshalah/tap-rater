import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  updateAdminCustomerAccess: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdminApi: mocks.requireAdminApi
}));

vi.mock("@/lib/admin-customers", () => ({
  updateAdminCustomerAccess: mocks.updateAdminCustomerAccess
}));

import { PATCH } from "@/app/api/admin/customers/[id]/access/route";

describe("admin customer access route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.updateAdminCustomerAccess.mockReset();
    mocks.updateAdminCustomerAccess.mockResolvedValue({ ok: true, status: "disabled" });
  });

  it("requires an authenticated admin", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await PATCH(createRequest("disabled"), { params: Promise.resolve({ id: "customer-1" }) });

    expect(response.status).toBe(401);
    expect(mocks.updateAdminCustomerAccess).not.toHaveBeenCalled();
  });

  it("updates access only with a valid customer id and status", async () => {
    const response = await PATCH(createRequest("disabled"), { params: Promise.resolve({ id: "customer-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "disabled" });
    expect(mocks.updateAdminCustomerAccess).toHaveBeenCalledWith("customer-1", "disabled");
  });

  it("rejects malformed customer identifiers", async () => {
    const response = await PATCH(createRequest("disabled"), { params: Promise.resolve({ id: "../customer-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.updateAdminCustomerAccess).not.toHaveBeenCalled();
  });
});

function createRequest(status: string) {
  return new Request("https://taprater.com/api/admin/customers/customer-1/access", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status })
  });
}
