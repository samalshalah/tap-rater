import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPublicRateLimitWithBinding, getTrustedRequestIp, rateLimitResponse } from "@/lib/public-rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public route rate limiting", () => {
  it("prefers the Cloudflare client address", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.20, 198.51.100.21",
      "x-real-ip": "192.0.2.30"
    });

    expect(getTrustedRequestIp(headers)).toBe("203.0.113.10");
  });

  it("uses a scoped HMAC key and reports a rejected limit", async () => {
    vi.stubEnv("IP_HASH_SECRET", "unit-test-secret");
    const limit = vi.fn().mockResolvedValue({ success: false });
    const request = new Request("https://taprater.com/api/checkout", {
      headers: { "cf-connecting-ip": "203.0.113.10" }
    });

    await expect(checkPublicRateLimitWithBinding(request, "checkout", { limit })).resolves.toEqual({ limited: true });
    expect(limit).toHaveBeenCalledOnce();
    const key = limit.mock.calls[0][0].key as string;
    expect(key).toMatch(/^checkout:[a-f0-9]{64}$/u);
    expect(key).not.toContain("203.0.113.10");
  });

  it("fails open when the platform binding is unavailable", async () => {
    const request = new Request("https://taprater.com/api/forms/contact", {
      headers: { "cf-connecting-ip": "203.0.113.10" }
    });
    const limit = vi.fn().mockRejectedValue(new Error("binding unavailable"));

    await expect(checkPublicRateLimitWithBinding(request, "contact", { limit })).resolves.toEqual({ limited: false });
  });

  it("returns a retryable 429 response", async () => {
    const response = rateLimitResponse();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
