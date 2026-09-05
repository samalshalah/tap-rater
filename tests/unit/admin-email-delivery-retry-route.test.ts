import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  retryAdminEmailDelivery: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/lib/admin-email-deliveries", () => ({
  retryAdminEmailDelivery: mocks.retryAdminEmailDelivery
}));

import { POST } from "@/app/api/admin/email-deliveries/[id]/retry/route";

const validId = "11111111-1111-4111-8111-111111111111";

describe("admin email delivery retry route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.retryAdminEmailDelivery.mockReset();
    mocks.retryAdminEmailDelivery.mockResolvedValue({ ok: true });
  });

  it("requires admin authentication", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(401);
    expect(mocks.retryAdminEmailDelivery).not.toHaveBeenCalled();
  });

  it("rejects malformed UUIDs", async () => {
    const response = await POST(createRequest(), { params: Promise.resolve({ id: "------------------------------------" }) });

    expect(response.status).toBe(400);
    expect(mocks.retryAdminEmailDelivery).not.toHaveBeenCalled();
  });

  it("starts a retry for a valid delivery", async () => {
    const response = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.retryAdminEmailDelivery).toHaveBeenCalledWith(validId);
  });

  it("forwards service errors and cooldown headers", async () => {
    mocks.retryAdminEmailDelivery.mockResolvedValue({
      ok: false,
      error: "Wait before retrying.",
      status: 429,
      retryAfterSeconds: 27
    });

    const response = await POST(createRequest(), { params: Promise.resolve({ id: validId }) });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("27");
    await expect(response.json()).resolves.toEqual({ error: "Wait before retrying." });
  });
});

function createRequest() {
  return new Request(`https://taprater.com/api/admin/email-deliveries/${validId}/retry`, { method: "POST" });
}
