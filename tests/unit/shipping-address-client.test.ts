import { afterEach, describe, expect, it, vi } from "vitest";
import { suggestShippingAddresses, selectShippingAddress } from "@/lib/shipping-address-client";

afterEach(() => vi.unstubAllGlobals());
describe("shipping address browser client", () => {
  it("keeps address text out of URLs and propagates cancellation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ suggestions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await suggestShippingAddresses("123 Main", "token", controller.signal);
    expect(fetchMock).toHaveBeenCalledWith("/api/checkout/address", expect.objectContaining({
      method: "POST", signal: controller.signal, cache: "no-store",
      body: JSON.stringify({ action: "suggest", query: "123 Main", sessionToken: "token" })
    }));
  });
  it("sends the same session token when selecting a suggestion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ address: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await selectShippingAddress("place", "token", new AbortController().signal);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: "select", placeId: "place", sessionToken: "token" });
  });
  it("rejects unavailable service responses for manual fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "unavailable" }, { status: 503 })));
    await expect(suggestShippingAddresses("123 Main", "token", new AbortController().signal)).rejects.toThrow("Address lookup unavailable");
  });
});
