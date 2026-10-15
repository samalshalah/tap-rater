import { beforeEach, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), render: vi.fn(), products: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/product-repository", () => ({ getStorefrontProducts: mocks.products }));
vi.mock("@/lib/production-artwork", async original => ({ ...await original<typeof import("@/lib/production-artwork")>(), composeProductionArtworkDocument: mocks.render }));
import { POST } from "@/app/api/admin/orders/complimentary/preview/route";
const setup = { businessName: "Example", destinationUrl: "https://example.com/review", logoStorageKey: "products/example/logo.png", logoSizePercent: 120, logoOffsetXPercent: 7, frontTemplateUrl: "https://untrusted.example/template.png", logoMediaUrl: "https://untrusted.example/logo.png" };
const request = (productId = "google-review-stand", origin = "https://taprater.com") => new Request("https://taprater.com/api/admin/orders/complimentary/preview", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ item: { productId, setup } }) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue(null); mocks.products.mockResolvedValue(migratedProducts); mocks.render.mockResolvedValue({ svg: "<svg/>" }); });
it("uses the catalog template and stored logo while preserving design controls", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mocks.render.mock.calls[0][0].setup).toMatchObject({ logoSizePercent: 120, logoOffsetXPercent: 7, logoMediaUrl: "/api/media/product/products/example/logo.png", frontTemplateUrl: migratedProducts.find(p => p.slug === "google-review-stand")!.assetSet!.brandedFrontTemplateUrl });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("requires admin access, same origin and an existing eligible stand", async () => {
  mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
  expect((await POST(request())).status).toBe(401);
  mocks.auth.mockResolvedValue(null);
  expect((await POST(request("google-review-stand", "https://other.example"))).status).toBe(403);
  expect((await POST(request("invented-stand"))).status).toBe(400);
  expect(mocks.render).not.toHaveBeenCalled();
});
