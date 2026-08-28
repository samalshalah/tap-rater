import { describe, expect, it } from "vitest";
import { isLikelyFullStandArtworkUpload } from "@/lib/admin-media-storage";

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
