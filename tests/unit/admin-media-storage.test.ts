import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { inspectUploadedImage, isLikelyFullStandArtworkUpload } from "@/lib/admin-media-storage";

describe("admin media storage", () => {
  it("detects full stand artwork uploaded as a logo", () => {
    expect(isLikelyFullStandArtworkUpload({ width: 1278, height: 1949 })).toBe(true);
    expect(isLikelyFullStandArtworkUpload({ width: 1024, height: 1536 })).toBe(true);
  });

  it("allows normal logo shapes", () => {
    expect(isLikelyFullStandArtworkUpload({ width: 1200, height: 400 })).toBe(false);
    expect(isLikelyFullStandArtworkUpload({ width: 800, height: 800 })).toBe(false);
    expect(isLikelyFullStandArtworkUpload({ width: 420, height: 640 })).toBe(false);
  });
});

describe("uploaded image format detection", () => {
  it.each(["jpeg", "png", "webp"] as const)("reads %s bytes even when the filename is misleading", async format => {
    const bytes = await sharp({ create: { width: 2172, height: 724, channels: 3, background: "black" } })
      .toFormat(format).toBuffer();
    const file = new File([new Uint8Array(bytes)], "customer-logo.png", { type: "image/png" });
    expect(inspectUploadedImage(await file.arrayBuffer())).toEqual({
      contentType: `image/${format}`, dimensions: { width: 2172, height: 724 }
    });
  });

  it("rejects unsupported and truncated data", () => {
    expect(inspectUploadedImage(new TextEncoder().encode("<svg/>").buffer)).toBeNull();
    expect(inspectUploadedImage(Uint8Array.from([255,216,255,255,255]).buffer)).toBeNull();
  });
});
