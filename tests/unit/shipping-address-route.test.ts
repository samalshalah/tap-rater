import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-rate-limit", () => ({ checkPublicRateLimit: vi.fn().mockResolvedValue({ limited: false }) }));
import { checkPublicRateLimit } from "@/lib/public-rate-limit";
import { POST } from "@/app/api/checkout/address/route";

const token = "15cc0e87-ec04-4dcc-89d5-84ea9548b45b";
const suggest = { action: "suggest", query: "123 Main", sessionToken: token };
const request = (body: unknown = suggest, headers = {}) => new Request("https://taprater.test/api/checkout/address", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body)
});
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "private-test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(checkPublicRateLimit).mockResolvedValue({ limited: false });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("checkout address lookup", () => {
  it("restricts suggestions to the US, shares a session token, limits fields, and never exposes the key", async () => {
    fetchMock.mockResolvedValue(Response.json({ suggestions: [{ placePrediction: { placeId: "abc", text: { text: "123 Main St, Richmond, VA" } } }] }));
    const response = await POST(request());
    expect(await response.json()).toEqual({ suggestions: [{ placeId: "abc", label: "123 Main St, Richmond, VA" }] });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:autocomplete");
    expect(options).toMatchObject({ method: "POST", cache: "no-store", headers: { "X-Goog-Api-Key": "private-test-key" } });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body)).toMatchObject({ includedRegionCodes: ["us"], sessionToken: token, input: "123 Main" });
    expect(checkPublicRateLimit).toHaveBeenCalledWith(expect.any(Request), "checkout-address", "PUBLIC_EVENT_RATE_LIMITER");
  });
  it("resolves a selected place into shipping fields using only address components", async () => {
    const components = [["street_number", "123"], ["route", "Main St"], ["locality", "Richmond"], ["administrative_area_level_1", "VA"], ["postal_code", "23220"], ["country", "US"]];
    fetchMock.mockResolvedValue(Response.json({ addressComponents: components.map(([type, value]) => ({ types: [type], longText: value, shortText: value })) }));
    const response = await POST(request({ action: "select", placeId: "place_1", sessionToken: token }));
    expect(await response.json()).toEqual({ address: { line1: "123 Main St", line2: "", city: "Richmond", state: "VA", postalCode: "23220", country: "US" } });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/v1/places/place_1");
    expect(url.searchParams.get("sessionToken")).toBe(token);
    expect(options.headers["X-Goog-FieldMask"]).toBe("addressComponents");
  });
  it.each([{ ...suggest, query: "12" }, { ...suggest, query: "x".repeat(161) }, { ...suggest, sessionToken: "bad" }, { action: "select", placeId: "../../secrets", sessionToken: token }, { ...suggest, extra: "field" }])("rejects malformed requests without calling Google", async (input) => {
    expect((await POST(request(input))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects oversized bodies, cross-site requests, and unsupported content types", async () => {
    expect((await POST(request({ ...suggest, query: "x".repeat(2100) }))).status).toBe(413);
    expect((await POST(request(suggest, { origin: "https://other.test" }))).status).toBe(403);
    expect((await POST(request(suggest, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(request(suggest, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("limits requests without consuming payment checkout quota", async () => {
    vi.mocked(checkPublicRateLimit).mockResolvedValue({ limited: true });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves a manual-entry fallback when unconfigured", async () => {
    for (const name of ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_PLATFORM_API_KEY", "MAPS_PLATFORM_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"]) vi.stubEnv(name, "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("manually");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("hides provider errors and credentials", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(Response.json({ error: { message: "private-test-key was denied" } }, { status: 403 }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-test-key");
    expect(console.warn).toHaveBeenCalledWith("Address lookup provider unavailable", { action: "suggest", status: 403 });
  });
  it("handles network failures and timeouts", async () => {
    fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    expect((await POST(request())).status).toBe(503);
  });
  it("does not accept a place without a complete US street address", async () => {
    fetchMock.mockResolvedValue(Response.json({ addressComponents: [] }));
    expect((await POST(request({ action: "select", placeId: "place_1", sessionToken: token }))).status).toBe(422);
  });
});
