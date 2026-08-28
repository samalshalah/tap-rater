import { describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({
  initOpenNextCloudflareForDev: vi.fn()
}));

describe("next config redirects", () => {
  it("keeps legacy redirects but does not redirect the embedded checkout route", async () => {
    const { default: nextConfig } = await import("../../next.config");
    const redirects = nextConfig.redirects ? await nextConfig.redirects() : [];

    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/faq", destination: "/faqs", permanent: true },
        { source: "/contact", destination: "/contact-us", permanent: true },
        { source: "/shop-by-use", destination: "/solutions", permanent: true },
        { source: "/custom-branding", destination: "/custom-stands", permanent: true },
        { source: "/product-category/:slug*", destination: "/shop", permanent: true },
        { source: "/my-account", destination: "/admin", permanent: true }
      ])
    );
    expect(redirects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/checkout"
        }),
        expect.objectContaining({
          source: "/multi-link"
        })
      ])
    );
  });
});
