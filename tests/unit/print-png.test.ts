import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { withPrintResolution, createPrintPng } from "@/lib/print-png";

describe("300 DPI print PNG", () => {
  it("sets both print axes to 300 DPI while preserving pixels and dimensions", async () => {
    const original = await sharp({ create: { width: 1278, height: 1949, channels: 4, background: "#126678" } }).png().withMetadata({ density: 72 }).toBuffer();
    const output = withPrintResolution(original);
    expect(await sharp(output).metadata()).toMatchObject({ width: 1278, height: 1949, density: 300 });
    expect((await sharp(output).raw().toBuffer()).equals(await sharp(original).raw().toBuffer())).toBe(true);
    // Repeated downloads replace pHYs rather than accumulating conflicting metadata.
    expect(withPrintResolution(output)).toEqual(output);
  });
  it("exports an existing PNG without requiring browser canvas or resampling", async () => {
    const original = await sharp({ create: { width: 100, height: 200, channels: 3, background: "white" } }).png().toBuffer();
    const result = await createPrintPng(new Blob([new Uint8Array(original)], { type: "image/png" }));
    expect(result.type).toBe("image/png");
    expect(await sharp(Buffer.from(await result.arrayBuffer())).metadata()).toMatchObject({width:100,height:200,density:300});
  });
  it("rejects invalid and truncated PNG bytes", () => {
    expect(() => withPrintResolution(new Uint8Array(50))).toThrow("Invalid PNG");
  });
});
