import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/email-deliveries/[id]/preview/route";
const { auth, preview } = vi.hoisted(() => ({ auth: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: auth }));
vi.mock("@/lib/admin-email-preview", () => ({ getAdminEmailPreview: preview }));
const context = { params: Promise.resolve({ id: "6ee382dc-f98c-419b-9515-fcc47d09f99d" }) };
beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue(null); });
describe("admin email preview", () => {
  it("requires admin authentication before retrieving private email content", async () => {
    auth.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await GET(new Request("https://example.com"), context)).status).toBe(401);
    expect(preview).not.toHaveBeenCalled();
  });
  it("returns a labeled preview without caching private email content", async () => {
    preview.mockResolvedValue({ source: "reconstructed", subject: "Order", html: "<p>Order</p>" });
    const response = await GET(new Request("https://example.com"), context);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ source: "reconstructed", subject: "Order" });
  });
  it("does not turn a missing email record into a template preview", async () => {
    preview.mockResolvedValue(null);
    expect((await GET(new Request("https://example.com"), context)).status).toBe(404);
  });
});
