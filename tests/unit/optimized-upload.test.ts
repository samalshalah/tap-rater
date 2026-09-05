import { describe, expect, it } from "vitest";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

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
