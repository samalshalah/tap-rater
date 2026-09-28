import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.context }));
import { checkSupportFormDuplicate, checkSupportFormRateLimit, getFormSecurityConfig, verifySupportForm } from "@/lib/support-form-security";
import { GET } from "@/app/api/site/form-security/route";

const fetchMock = vi.fn();
const request = (headers: Record<string, string> = {}, host = "taprater.com") => new Request(`https://${host}/api/forms/contact`, {
  headers: { "cf-connecting-ip": "203.0.113.7", origin: `https://${host}`, ...headers }
});
const payload = { companyWebsite: "", turnstileToken: "valid-token" };

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TURNSTILE_SITE_KEY", "production-site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "private-validation-secret");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(Response.json({ success: true, hostname: "taprater.com", action: "contact" }));
  mocks.context.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("support form verification", () => {
  it("exposes only the public key, without caching", async () => {
    const response = GET();
    expect(await response.json()).toEqual({ siteKey: "production-site-key" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("requires both keys and refuses dummy keys in production", () => {
    expect(getFormSecurityConfig({ TURNSTILE_SITE_KEY: "site" }).siteKey).toBeNull();
    expect(getFormSecurityConfig({ NODE_ENV: "production", TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "secret" }).siteKey).toBeNull();
    expect(getFormSecurityConfig({ NODE_ENV: "production", TURNSTILE_SITE_KEY: "site", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" }).siteKey).toBeNull();
  });

  it.each([null, {}, { ...payload, turnstileToken: "" }, { ...payload, turnstileToken: "x".repeat(2049) },
    { ...payload, turnstileToken: 42 }, { ...payload, companyWebsite: "https://spam.example" }])("rejects missing/invalid tokens and honeypots", async fields => {
    expect((await verifySupportForm(request(), "contact", fields))?.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed if configuration is missing", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect((await verifySupportForm(request(), "contact", payload))?.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates with Siteverify and keeps the token and secret out of responses", async () => {
    expect(await verifySupportForm(request(), "contact", payload)).toBeNull();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(JSON.parse(options.body)).toEqual({ secret: "private-validation-secret", response: "valid-token", remoteip: "203.0.113.7" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: true, hostname: "evil.example", action: "contact" },
    { success: true, hostname: "taprater.com", action: "setup" },
    { success: true }, { success: "true", hostname: "taprater.com", action: "contact" }
  ])("rejects expired, replayed, mismatched or malformed verification", async result => {
    fetchMock.mockResolvedValue(Response.json(result));
    expect((await verifySupportForm(request(), "contact", payload))?.status).toBe(400);
  });

  it("rejects cross-origin and unexpected hosts before verification", async () => {
    expect((await verifySupportForm(request({ origin: "https://evil.example" }), "contact", payload))?.status).toBe(400);
    expect((await verifySupportForm(request({}, "preview.example"), "contact", payload))?.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not bypass hostname/action matching for real keys on localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await verifySupportForm(request({}, "localhost"), "contact", payload))?.status).toBe(400);
  });

  it("supports official dummy keys only on a local development host", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    expect(await verifySupportForm(request({}, "localhost"), "contact", payload)).toBeNull();
    fetchMock.mockResolvedValue(Response.json({ success: true, hostname: "dummy-key-pass", action: "" }));
    expect((await verifySupportForm(request(), "contact", payload))?.status).toBe(400);
  });

  it("fails closed on service errors and network timeouts", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect((await verifySupportForm(request(), "contact", payload))?.status).toBe(503);
    fetchMock.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    expect((await verifySupportForm(request(), "contact", payload))?.status).toBe(503);
    fetchMock.mockResolvedValueOnce(new Response("not json"));
    expect((await verifySupportForm(request(), "contact", payload))?.status).toBe(503);
  });
});

describe("support rate and duplicate limits", () => {
  it("uses one shared hashed IP limit across the three support forms", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    mocks.context.mockResolvedValue({ env: { SUPPORT_FORM_RATE_LIMITER: { limit } } });
    expect(await checkSupportFormRateLimit(request())).toBeNull();
    expect(limit.mock.calls[0][0].key).toMatch(/^support:[a-f0-9]{64}$/);
    limit.mockResolvedValue({ success: false });
    const blocked = await checkSupportFormRateLimit(request());
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBe("60");
  });

  it("fails closed without an authentic edge IP, binding or platform service", async () => {
    expect((await checkSupportFormRateLimit(new Request("https://taprater.com/api/forms/contact", { headers: { "x-forwarded-for": "203.0.113.7" } })))?.status).toBe(503);
    mocks.context.mockResolvedValueOnce({ env: {} });
    expect((await checkSupportFormRateLimit(request()))?.status).toBe(503);
    mocks.context.mockRejectedValueOnce(new Error("unavailable"));
    expect((await checkSupportFormRateLimit(request()))?.status).toBe(503);
  });

  it("recognizes normalized repeats across IPs without putting PII in limiter keys", async () => {
    const limit = vi.fn().mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    mocks.context.mockResolvedValue({ env: { SUPPORT_FORM_DUPLICATE_LIMITER: { limit } } });
    expect(await checkSupportFormDuplicate(request(), "contact", { email: " Person@example.com ", message: "Please  help" })).toBeNull();
    expect((await checkSupportFormDuplicate(request({ "cf-connecting-ip": "198.51.100.2" }), "contact", { message: "please help", email: "person@example.com" }))?.status).toBe(429);
    expect(limit.mock.calls[0][0]).toEqual(limit.mock.calls[1][0]);
    expect(JSON.stringify(limit.mock.calls)).not.toContain("example.com");
  });

  it("skips edge-only rate bindings locally but never on a production host", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await checkSupportFormRateLimit(request({}, "localhost"))).toBeNull();
    expect((await checkSupportFormRateLimit(request()))?.status).toBe(503);
  });
});
