import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), invite: vi.fn(), moderate: vi.fn(), sql: vi.fn(), bucket: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/product-reviews", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/product-reviews")>(), sendReviewInvitation: mocks.invite, moderateProductReview: mocks.moderate, reviewDb: () => mocks.sql }));
vi.mock("@/lib/admin-media-storage", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/admin-media-storage")>(), getProductMediaBucket: mocks.bucket }));
import { POST } from "@/app/api/admin/product-reviews/route";
import { GET as photo } from "@/app/api/product-reviews/photo/[id]/route";
const id = "98d73b1e-d364-4077-8f7a-c351205ea3cf";
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue(null); mocks.invite.mockResolvedValue({ sent: true }); });
describe("review admin access and private photos", () => {
  it("requires admin authentication before sending any email", async () => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    const response = await POST(new Request("https://taprater.com/api/admin/product-reviews", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401); expect(mocks.invite).not.toHaveBeenCalled();
  });
  it.each([undefined, "https://evil.example"])("rejects cross-site or missing origins: %s", async origin => {
    const response = await POST(new Request("https://taprater.com/api/admin/product-reviews", { method: "POST", headers: origin ? { origin } : {}, body: JSON.stringify({ action: "invite", name: "Sam", email: "sam@example.com" }) }));
    expect(response.status).toBe(403); expect(mocks.invite).not.toHaveBeenCalled();
  });
  it("sends only after an authenticated same-origin POST", async () => {
    const response = await POST(new Request("https://taprater.com/api/admin/product-reviews", { method: "POST", headers: { origin: "https://taprater.com" }, body: JSON.stringify({ action: "invite", name: "Sam", email: "sam@example.com" }) }));
    expect(response.status).toBe(200); expect(mocks.invite).toHaveBeenCalledTimes(1);
  });
  it.each([
    { moderation_status: "pending", publish_permission: true, photo_permission: true },
    { moderation_status: "published", publish_permission: true, photo_permission: false },
    { moderation_status: "private", publish_permission: false, photo_permission: true },
  ])("hides photos without publication AND both permissions: %j", async fields => {
    mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
    mocks.sql.mockResolvedValue([{ photo_key: "product-reviews/key.jpg", ...fields }]);
    const response = await photo(new Request("https://taprater.com"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(404); expect(mocks.bucket).not.toHaveBeenCalled();
  });
  it("serves an approved photo without caching a copy that could outlive withdrawal", async () => {
    mocks.sql.mockResolvedValue([{ photo_key: "product-reviews/key.jpg", moderation_status: "published", publish_permission: true, photo_permission: true }]);
    mocks.bucket.mockResolvedValue({ get: async () => ({ arrayBuffer: async () => new ArrayBuffer(5) }) });
    const response = await photo(new Request("https://taprater.com"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store"); expect(mocks.auth).not.toHaveBeenCalled();
  });
});
