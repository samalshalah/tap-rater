import { describe, expect, it } from "vitest";
import { getLegacyPublicAssetUrl, legacyPublicAssetRewrites } from "@/lib/legacy-public-assets";

describe("Cloudflare legacy asset routing", () => {
  it.each(legacyPublicAssetRewrites)("resolves $source without losing the query", ({ source, destination }) => {
    const request = new Request(`https://taprater.com${source}?v=2`);
    expect(getLegacyPublicAssetUrl(request)?.toString()).toBe(`https://taprater.com${destination}?v=2`);
    expect(request.url).toBe(`https://taprater.com${source}?v=2`);
  });

  it("resolves HEAD requests", () => {
    const { source, destination } = legacyPublicAssetRewrites[0];
    const request = new Request(`https://taprater.com${source}`, { method: "HEAD" });
    expect(getLegacyPublicAssetUrl(request)?.pathname).toBe(destination);
  });

  it.each([
    ["/cart", "GET"],
    ["/uploads/products/missing.png", "GET"],
    ["/uploads/products/social-media-stand.png", "POST"],
    ["/uploads-optimized/products/social-media-stand-w999.webp", "GET"]
  ])("leaves %s %s to Next", (path, method) => {
    expect(getLegacyPublicAssetUrl(new Request(`https://taprater.com${path}`, { method }))).toBeUndefined();
  });
});
