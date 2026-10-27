import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultProductionArtworkAssetResolver } from "@/lib/production-artwork-assets";
afterEach(() => vi.unstubAllGlobals());
describe("production asset base64 fallback", () => {
  it.each([1, 32767, 32768, 32769, 70000])("matches native encoding and hashes for %i bytes", async length => {
    const bytes = Uint8Array.from({ length }, (_, index) => index % 256);
    const uri = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
    const native = await defaultProductionArtworkAssetResolver(uri);
    vi.stubGlobal("Buffer", undefined);
    const fallback = await defaultProductionArtworkAssetResolver(uri);
    expect(fallback).toEqual(native);
    expect(fallback.dataUri).toBe(uri);
  });
  it("preserves UTF-8 SVG content in the fallback", async () => {
    const uri = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text>Café مرحبا</text></svg>').toString("base64")}`;
    const native = await defaultProductionArtworkAssetResolver(uri);
    vi.stubGlobal("Buffer", undefined);
    expect(await defaultProductionArtworkAssetResolver(uri)).toEqual(native);
  });
});
