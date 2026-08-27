import { describe, expect, it } from "vitest";
import { buildDirectProductionTargets, buildProofApprovalSnapshot, isProofApprovalSnapshotCurrent } from "@/lib/direct-production";

const approvedSnapshot = buildProofApprovalSnapshot({
  productSlug: "google-review-stand",
  optionCode: "branded_qr_direct",
  destinationUrl: "https://g.page/example/review",
  businessName: "Nova Implant",
  logoStorageKey: "products/customer-setup/logo.png",
  logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
  generatedQrValue: "https://g.page/example/review",
  frontTemplateUrl: "/api/media/product/products/google-review/front-template.png"
});

describe("direct production approval snapshots", () => {
  it("keeps QR and NFC pointed directly to the customer destination", () => {
    expect(buildDirectProductionTargets("https://example.com/review")).toEqual({
      destinationUrl: "https://example.com/review",
      qrTargetUrl: "https://example.com/review",
      nfcTargetUrl: "https://example.com/review"
    });
  });

  it.each([
    ["logo", { logoMediaUrl: "/api/media/product/products/customer-setup/new-logo.png" }],
    ["business name", { businessName: "Changed Business" }],
    ["destination", { destinationUrl: "https://example.com/changed", generatedQrValue: "https://example.com/changed" }],
    ["front template", { frontTemplateUrl: "/api/media/product/products/google-review/new-template.png" }]
  ])("invalidates approval when %s changes", (_, patch) => {
    expect(isProofApprovalSnapshotCurrent({ ...approvedSnapshot, ...patch }, approvedSnapshot)).toBe(false);
  });

  it("ignores legacy center asset and CTA values because the owner template owns those layers", () => {
    expect(
      isProofApprovalSnapshotCurrent(
        {
          ...approvedSnapshot,
          centerAssetUrl: "/api/media/product/products/yelp-review/center/yelp.svg",
          ctaText: "Review us on Yelp"
        },
        approvedSnapshot
      )
    ).toBe(true);
  });

  it("keeps approval current when all visual production inputs match", () => {
    expect(isProofApprovalSnapshotCurrent(approvedSnapshot, approvedSnapshot)).toBe(true);
  });
});
