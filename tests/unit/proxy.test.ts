import { describe, expect, it } from "vitest";
import { getCanonicalRedirectUrl } from "@/lib/canonical-request";

describe("canonical host redirect", () => {
  it("redirects the HTTP apex host to HTTPS and preserves path and query", () => {
    const destination = getCanonicalRedirectUrl(new Request("http://taprater.com/shop?type=review"));

    expect(destination?.toString()).toBe("https://taprater.com/shop?type=review");
  });

  it("redirects the www host to the HTTPS apex host", () => {
    const destination = getCanonicalRedirectUrl(new Request("https://www.taprater.com/product/google-review-stand"));

    expect(destination?.toString()).toBe("https://taprater.com/product/google-review-stand");
  });

  it("continues canonical and local requests", () => {
    expect(getCanonicalRedirectUrl(new Request("https://taprater.com/shop"))).toBeUndefined();
    expect(getCanonicalRedirectUrl(new Request("http://127.0.0.1:3000/shop"))).toBeUndefined();
  });

  it("uses forwarded host and protocol when running behind a local proxy", () => {
    const request = new Request("http://127.0.0.1:8788/shop?probe=1", {
      headers: { "x-forwarded-host": "www.taprater.com", "x-forwarded-proto": "https" }
    });

    expect(getCanonicalRedirectUrl(request)?.toString()).toBe("https://taprater.com/shop?probe=1");
  });
});
