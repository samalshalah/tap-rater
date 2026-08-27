import { describe, expect, it } from "vitest";
import { getBrandedProductionTemplateReadiness } from "@/lib/admin-product-readiness";

describe("admin product readiness", () => {
  it("marks Branded Direct unavailable when its production front template is missing", () => {
    expect(
      getBrandedProductionTemplateReadiness(
        { assetSet: {} },
        [{ optionCode: "branded_qr_direct", isActive: true }]
      )
    ).toMatchObject({
      status: "missing",
      reason: expect.stringContaining("branded front template")
    });
  });

  it("marks Branded Direct unavailable when the center asset is missing", () => {
    expect(
      getBrandedProductionTemplateReadiness(
        { assetSet: { brandedFrontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png" } },
        [{ optionCode: "branded_qr_direct", isActive: true }]
      )
    ).toMatchObject({
      status: "missing",
      reason: "Missing center asset"
    });
  });

  it("marks Branded Direct ready only when the front template and center asset exist", () => {
    expect(
      getBrandedProductionTemplateReadiness(
        {
          assetSet: {
            brandedFrontTemplateUrl: "/api/media/product/products/google-review-stand/branded_front_template/template.png",
            centerAssetUrl: "/api/media/product/products/google-review-stand/center_asset/google.svg"
          }
        },
        [{ optionCode: "branded_qr_direct", isActive: true }]
      )
    ).toEqual({ status: "ready" });
  });

  it("does not require branded template metadata when Branded Direct is not offered", () => {
    expect(
      getBrandedProductionTemplateReadiness(
        { assetSet: {} },
        [{ optionCode: "standard_direct", isActive: true }]
      )
    ).toEqual({ status: "not_offered" });
  });
});
