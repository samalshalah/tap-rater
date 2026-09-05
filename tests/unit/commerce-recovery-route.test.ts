import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: vi.fn() }));
vi.mock("@/lib/commerce-recovery", () => ({ retryCommerceRecovery: vi.fn() }));
import { requireAdminApi } from "@/lib/admin-auth";
import { retryCommerceRecovery } from "@/lib/commerce-recovery";
import { POST } from "@/app/api/admin/commerce-recovery/route";
const request = (id: unknown) => new Request("https://taprater.test/api/admin/commerce-recovery", { method: "POST", body: JSON.stringify({ id }) });
afterEach(() => vi.resetAllMocks());
describe("admin commerce recovery", () => {
  it("requires admin authentication before lookup", async () => {
    vi.mocked(requireAdminApi).mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 }) as any);
    expect((await POST(request("test:checkout:cs_test_123"))).status).toBe(401);
    expect(retryCommerceRecovery).not.toHaveBeenCalled();
  });
  it.each([null, "cs_test_123", "test:checkout:../../secrets", "test:other:cs_test_123", "live:invoice:pi_bad"])("rejects invalid identifiers %s", async id => {
    vi.mocked(requireAdminApi).mockResolvedValue(null);
    expect((await POST(request(id))).status).toBe(400);
    expect(retryCommerceRecovery).not.toHaveBeenCalled();
  });
  it("retries only the specified persisted job", async () => {
    vi.mocked(requireAdminApi).mockResolvedValue(null);
    vi.mocked(retryCommerceRecovery).mockResolvedValue(Response.json({ received: true }) as any);
    expect((await POST(request("test:checkout:cs_test_123"))).status).toBe(200);
    expect(retryCommerceRecovery).toHaveBeenCalledWith("test:checkout:cs_test_123");
  });
  it("does not disclose provider errors", async () => {
    vi.mocked(requireAdminApi).mockResolvedValue(null);
    vi.mocked(retryCommerceRecovery).mockRejectedValue(new Error("private provider payload"));
    const result = await POST(request("test:invoice:in_test123"));
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("private provider payload");
  });
});
