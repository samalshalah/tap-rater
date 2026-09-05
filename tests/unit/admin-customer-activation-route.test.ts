import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  resendAdminCustomerActivation: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdminApi: mocks.requireAdminApi
}));

vi.mock("@/lib/admin-customers", () => ({
  resendAdminCustomerActivation: mocks.resendAdminCustomerActivation
}));

import { POST } from "@/app/api/admin/customers/[id]/activation/route";

describe("admin customer activation route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.resendAdminCustomerActivation.mockReset();
    mocks.resendAdminCustomerActivation.mockResolvedValue({ ok: true });
  });

  it("requires an authenticated admin", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "customer-1" }) });

    expect(response.status).toBe(401);
    expect(mocks.resendAdminCustomerActivation).not.toHaveBeenCalled();
  });

  it("sends activation only for a valid customer identifier", async () => {
    const response = await POST(createRequest(), { params: Promise.resolve({ id: "customer-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.resendAdminCustomerActivation).toHaveBeenCalledWith("customer-1");
  });

  it("rejects malformed customer identifiers", async () => {
    const response = await POST(createRequest(), { params: Promise.resolve({ id: "../customer-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.resendAdminCustomerActivation).not.toHaveBeenCalled();
  });

  it("preserves service status and cooldown headers", async () => {
    mocks.resendAdminCustomerActivation.mockResolvedValue({
      ok: false,
      error: "Wait before trying again.",
      status: 429,
      retryAfterSeconds: 240
    });

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "customer-1" }) });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("240");
    await expect(response.json()).resolves.toEqual({ error: "Wait before trying again." });
  });
});

function createRequest() {
  return new Request("https://taprater.com/api/admin/customers/customer-1/activation", { method: "POST" });
}
