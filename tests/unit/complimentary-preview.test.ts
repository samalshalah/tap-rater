import { readFile } from "node:fs/promises";
import sharp from "sharp";
import jsQR from "jsqr";
import { createBrandedProof } from "@/lib/branded-proof";
import { beforeEach, expect, it, vi } from "vitest";
import { complimentaryFormCatalog } from "@/lib/complimentary-orders";
import { migratedProducts } from "@/data/migrated-products";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), render: vi.fn(), products: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/product-repository", () => ({ getCheckoutProducts: mocks.products }));
vi.mock("@/lib/production-artwork", async original => ({ ...await original<typeof import("@/lib/production-artwork")>(), composeProductionArtworkDocument: mocks.render }));
import { POST } from "@/app/api/admin/orders/complimentary/preview/route";
const setup = { businessName: "Example", destinationUrl: "https://example.com/review", logoStorageKey: "products/example/logo.png", logoSizePercent: 120, logoOffsetXPercent: 7, frontTemplateUrl: "https://untrusted.example/template.png", logoMediaUrl: "https://untrusted.example/logo.png" };
const request = (productId = "google-review-stand", origin = "https://taprater.com", design = setup) => new Request("https://taprater.com/api/admin/orders/complimentary/preview", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ item: { productId, setup: design } }) });
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

it("uses the selected Instagram print template with the uploaded logo and no business name", async () => {
  const slug = "instagram-follow-stand";
  expect((await POST(request(slug, "https://taprater.com", { ...setup, businessName: "" }))).status).toBe(200);
  const item = mocks.render.mock.calls[0][0];
  expect(item.setup.businessName).toBe("");
  expect(item.setup.frontTemplateUrl).toBe(migratedProducts.find(p => p.slug === slug)?.assetSet?.brandedFrontTemplateUrl);
  expect(item.setup.logoMediaUrl).toBe("/api/media/product/" + setup.logoStorageKey);
  expect(item.setup.qrTargetUrl).toBe(setup.destinationUrl);
});

it("does not use a print template as the product photo for any branded stand", () => {
  const catalog = complimentaryFormCatalog(migratedProducts);
  expect(catalog.some(p => p.slug === "instagram-follow-stand")).toBe(true);
  for (const row of catalog) {
    const branded = row.options.find(option => option.id === "branded_qr_direct");
    if (!branded) continue;
    const template = migratedProducts.find(p => p.slug === row.slug)?.assetSet?.brandedFrontTemplateUrl;
    expect(branded.image, row.slug).not.toBe(template);
  }
});

it("renders the uploaded logo and a scannable Instagram QR on the nameless admin proof", async () => {
  const { composeProductionArtworkDocument } = await vi.importActual<typeof import("@/lib/production-artwork")>("@/lib/production-artwork");
  mocks.render.mockImplementation((item, template, hash, date) =>
    composeProductionArtworkDocument(item, template, hash, date, async url => {
      const isLogo = url.startsWith("/api/media/product/");
      const bytes = await readFile(isLogo ? "public/uploads/brand/tap-rater-logo.png" : "public" + url);
      return { contentType: "image/png", dataUri: "data:image/png;base64," + bytes.toString("base64"), contentHash: isLogo ? "logo" : "template" };
    }));
  const destinationUrl = "https://www.instagram.com/taprater/";
  const result = await POST(request("instagram-follow-stand", "https://taprater.com", { ...setup, businessName: "", destinationUrl }));
  expect(result.status).toBe(200);
  const { svg } = await result.json();
  expect(svg).not.toContain("data-business-name=");
  const {data,info} = await sharp(Buffer.from(svg), {density:300}).resize(1278,1949).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  expect(jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data).toBe(destinationUrl);
  const product = migratedProducts.find(p => p.slug === "instagram-follow-stand")!;
  const storefront = await createBrandedProof(product, {
    businessName: "", destinationUrl, logoSizePercent: 120, logoOffsetXPercent: 7,
    logoStorageKey: "products/customer-setup-instagram-follow-stand/center_asset/example.png"
  }, {getText: async () => null, putText: async () => {}, putTextIfAbsent: async () => true});
  const storefrontPixels = await sharp(Buffer.from(storefront.svg), {density:300}).resize(1278,1949).ensureAlpha().raw().toBuffer();
  expect(data.equals(storefrontPixels)).toBe(true);
});
