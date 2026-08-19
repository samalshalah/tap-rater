import { describe, expect, it } from "vitest";
import { createQrSvg, QR_CODE_ERROR_MESSAGE, QR_CODE_OPTIONS } from "@/lib/qr-code";

describe("QR code generation", () => {
  it("generates a real scalable SVG QR code for the exact destination URL", async () => {
    const svg = await createQrSvg("https://g.page/r/CUh5h1LoT0k-EAE/review");

    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox");
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).not.toContain("grid-cols-7");
  });

  it("uses print-friendly QR settings", () => {
    expect(QR_CODE_OPTIONS.errorCorrectionLevel).toBe("Q");
    expect(QR_CODE_OPTIONS.margin).toBe(4);
    expect(QR_CODE_OPTIONS.width).toBe(512);
    expect(QR_CODE_OPTIONS.color.dark).toBe("#000000");
    expect(QR_CODE_OPTIONS.color.light).toBe("#ffffff");
  });

  it("fails clearly instead of returning a fake QR fallback", async () => {
    await expect(createQrSvg(" ")).rejects.toThrow(QR_CODE_ERROR_MESSAGE);
  });
});
