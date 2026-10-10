import { describe, expect, it } from "vitest";
import { optimizedUploadSrc, optimizedUploadSrcSet } from "@/lib/optimized-upload";

describe("optimized upload paths", () => {
  it("maps supported local uploads to deterministic WebP variants", () => {
    expect(optimizedUploadSrc("/uploads/products/stand.JPG", 640)).toBe("/uploads-optimized/products/stand-w640.webp");
    expect(optimizedUploadSrc("/uploads/brand/logo.png?version=2#mark", 160)).toBe(
      "/uploads-optimized/brand/logo-w160.webp?version=2#mark"
    );
  });

  it("leaves remote and dynamic media paths unchanged", () => {
    expect(optimizedUploadSrc("https://cdn.example.com/stand.jpg", 1200)).toBe("https://cdn.example.com/stand.jpg");
    expect(optimizedUploadSrc("/api/media/product/stand", 640)).toBe("/api/media/product/stand");
  });
});

describe("responsive upload candidates", () => {
  it("offers smaller product images and preserves cache query strings", () => {
    const candidates = optimizedUploadSrcSet("/uploads/products/taprater-stands/google/google-standard-angled.png?v=2");
    expect(candidates).toContain("-w320.webp?v=2 320w");
    expect(candidates).toContain("-w480.webp?v=2 480w");
    expect(candidates).toContain("-w1200.webp?v=2 1200w");
  });

  it("does not advertise nonexistent variants for remote or dynamic media", () => {
    expect(optimizedUploadSrcSet("https://cdn.example.com/stand.jpg")).toBeUndefined();
    expect(optimizedUploadSrcSet("/api/media/product/stand")).toBeUndefined();
    expect(optimizedUploadSrcSet("/uploads/not-yet-generated.png")).toBeUndefined();
  });
});
