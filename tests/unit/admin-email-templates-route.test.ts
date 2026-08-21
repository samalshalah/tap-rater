import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin email template API", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("requires admin auth for test-send", async () => {
    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }))
    }));

    const { POST } = await import("@/app/api/admin/email-templates/test/route");
    const response = await POST(
      new Request("https://taprater.test/api/admin/email-templates/test", {
        method: "POST",
        body: JSON.stringify({ key: "customer-order-confirmation" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Admin authentication required." });
  });
});
