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


describe("PNG upload completeness", () => {
  it("rejects a signature and forged dimensions without image data", () => {
    const bytes = new Uint8Array(24);
    bytes.set([137,80,78,71,13,10,26,10]);
    new DataView(bytes.buffer).setUint32(16,128);new DataView(bytes.buffer).setUint32(20,128);
    expect(inspectUploadedImage(bytes.buffer)).toBeNull();
  });
  it("rejects missing/truncated PNG chunks while retaining real palette and metadata PNGs", async () => {
    const png=await sharp({create:{width:128,height:128,channels:4,background:{r:96,g:53,b:255,alpha:0.5}}}).withMetadata().png({palette:true}).toBuffer();
    expect(inspectUploadedImage(Uint8Array.from(png).buffer)).toMatchObject({contentType:'image/png',dimensions:{width:128,height:128}});
    for(const size of [24,33,png.length-1])expect(inspectUploadedImage(Uint8Array.from(png.subarray(0,size)).buffer)).toBeNull();
    const noImage=Buffer.from(png);const marker=noImage.indexOf('IDAT');expect(marker).toBeGreaterThan(0);noImage.write('tEXt',marker);
    expect(inspectUploadedImage(Uint8Array.from(noImage).buffer)).toBeNull();
    const invalidLength=Buffer.from(png);invalidLength.writeUInt32BE(0xffffffff,marker-4);
    expect(inspectUploadedImage(Uint8Array.from(invalidLength).buffer)).toBeNull();
  });
});
