import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ limit: vi.fn(), proof: vi.fn(), reserve: vi.fn() }));
vi.mock("@/lib/public-rate-limit", () => ({
  checkPublicRateLimit: mocks.limit,
  rateLimitResponse: () => Response.json({ error: "Too many requests" }, { status: 429 })
}));
vi.mock("@/lib/product-repository", () => ({ getCheckoutProductBySlug: async () => ({ slug: "google-review-stand", isActive: true }) }));
vi.mock("@/lib/purchase-options", () => ({ getProductPurchaseOptions: () => [{ id: "branded_qr_direct" }], isHostedPurchaseOptionEnabled: () => true }));
vi.mock("@/lib/service-addons", () => ({ productSupportsMultiLink: () => true }));
vi.mock("@/lib/branded-proof", () => ({ requireProofStorage: async () => ({}), createBrandedProof: mocks.proof, reserveBrandedHostedDestination: mocks.reserve }));
import { POST } from "@/app/api/setup/proof/route";

const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
beforeEach(() => {
  vi.resetAllMocks();
  const counts = new Map<string, number>();
  mocks.limit.mockImplementation(async (_request, scope, binding) => {
    const quota = config.ratelimits.find((entry: { name: string }) => entry.name === binding).simple.limit;
    const count = (counts.get(scope) ?? 0) + 1;
    counts.set(scope, count);
    return { limited: count > quota };
  });
  mocks.proof.mockImplementation(async (_product, setup) => ({ svg: `<svg data-size="${setup.logoSizePercent}"/>`, snapshot: setup, proofReceiptId: "proof" }));
  mocks.reserve.mockResolvedValue({ id: "reserved", url: "https://taprater.com/p/test" });
});
function request(size: number, reserve = false) {
  return new Request("https://taprater.com/api/setup/proof", { method: "POST", headers: { origin: "https://taprater.com" }, body: JSON.stringify({
    action: reserve ? "reserve" : undefined,
    item: { productId: "google-review-stand", optionId: "branded_qr_direct", quantity: 1, setup: { logoSizePercent: size, serviceAddon: reserve ? "hosted_multilink" : undefined } }
  }) });
}
it("refreshes more than ten successive logo adjustments without the contact-form quota", async () => {
  for (let index = 0; index < 20; index++) {
    const size = 75 + (index % 18) * 5;
    const response = await POST(request(size));
    expect(response.status).toBe(200);
    expect((await response.json()).snapshot.logoSizePercent).toBe(size);
  }
  expect(mocks.proof).toHaveBeenCalledTimes(20);
});
it("still enforces the separate preview quota", async () => {
  mocks.limit.mockResolvedValue({ limited: true });
  expect((await POST(request(100))).status).toBe(429);
  expect(mocks.proof).not.toHaveBeenCalled();
});
it("retains the ten-per-minute quota for permanent hosted reservations", async () => {
  for (let index = 0; index < 10; index++) expect((await POST(request(100, true))).status).toBe(200);
  expect((await POST(request(100, true))).status).toBe(429);
  expect(mocks.reserve).toHaveBeenCalledTimes(10);
});
