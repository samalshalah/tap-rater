import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import {
  cartItemRequestsPermanentHostedCode,
  getCanonicalProductModel,
  getProductDestinationMode,
  getProductDestinationTargets,
  getPurchaseOptionCustomizationLevel,
  getPurchaseOptionDestinationMode,
  isProductOptionArchitectureConsistent
} from "@/lib/product-model";
import { brandedQrDirectOption, hostedMultiLinkOption, standardDirectOption } from "@/lib/purchase-options";

describe("canonical product model", () => {
  const googleStand = migratedProducts.find((product) => product.slug === "google-review-stand");

  if (!googleStand) {
    throw new Error("Expected Google stand fixture");
  }

  it("classifies launch storefront products as DIRECT without hosted requirements", () => {
    const model = getCanonicalProductModel(googleStand);

    expect(model).toEqual({
      destinationMode: "DIRECT",
      customizationLevel: "BRANDED"
    });
    expect(googleStand.requiresAccount).toBe(false);
    expect(googleStand.requiresSubscription).toBe(false);
    expect(googleStand.requiresLandingPage).toBe(false);
  });

  it("classifies hosted products from existing platform fields", () => {
    const hostedProduct = {
      ...googleStand,
      productType: "platform_landing_page" as const,
      serviceMode: "hosted_landing_page" as const,
      productKind: "hosted_multilink" as const,
      requiresAccount: true,
      requiresSubscription: true,
      requiresLandingPage: true
    };

    expect(getProductDestinationMode(hostedProduct)).toBe("HOSTED");
    expect(getCanonicalProductModel(hostedProduct)).toMatchObject({
      destinationMode: "HOSTED",
      customizationLevel: "BRANDED"
    });
  });

  it("keeps destination mode separate from customization level", () => {
    expect(getPurchaseOptionDestinationMode(standardDirectOption)).toBe("DIRECT");
    expect(getPurchaseOptionCustomizationLevel(standardDirectOption)).toBe("STANDARD");
    expect(getPurchaseOptionDestinationMode(brandedQrDirectOption)).toBe("DIRECT");
    expect(getPurchaseOptionCustomizationLevel(brandedQrDirectOption)).toBe("BRANDED");
    expect(getPurchaseOptionDestinationMode(hostedMultiLinkOption)).toBe("HOSTED");
    expect(getPurchaseOptionCustomizationLevel(hostedMultiLinkOption)).toBe("BRANDED");
  });

  it("derives QR and NFC destination from DIRECT mode", () => {
    const targets = getProductDestinationTargets({
      destinationMode: "DIRECT",
      directDestinationUrl: "https://example.com/review"
    });

    expect(targets).toEqual({
      ok: true,
      destinationMode: "DIRECT",
      qrDestinationUrl: "https://example.com/review",
      nfcDestinationUrl: "https://example.com/review"
    });
  });

  it("derives QR and NFC destination from HOSTED mode without using a customer URL", () => {
    const targets = getProductDestinationTargets({
      destinationMode: "HOSTED",
      hostedPageCode: "ABC123",
      siteUrl: "https://taprater.com"
    });

    expect(targets).toEqual({
      ok: true,
      destinationMode: "HOSTED",
      qrDestinationUrl: "https://taprater.com/p/ABC123",
      nfcDestinationUrl: "https://taprater.com/p/ABC123"
    });
  });

  it("rejects invalid destination inputs for canonical target derivation", () => {
    expect(getProductDestinationTargets({ destinationMode: "DIRECT", directDestinationUrl: "javascript:alert(1)" })).toMatchObject({
      ok: false,
      reason: "invalid_url"
    });
    expect(getProductDestinationTargets({ destinationMode: "HOSTED" })).toMatchObject({
      ok: false,
      reason: "missing_hosted_code"
    });
  });

  it("rejects HOSTED options on DIRECT products", () => {
    expect(isProductOptionArchitectureConsistent(googleStand, standardDirectOption)).toBe(true);
    expect(isProductOptionArchitectureConsistent(googleStand, brandedQrDirectOption)).toBe(true);
    expect(isProductOptionArchitectureConsistent(googleStand, hostedMultiLinkOption)).toBe(false);
  });

  it("detects premature permanent hosted page code requests in cart setup", () => {
    expect(cartItemRequestsPermanentHostedCode({ setup: { destinationUrl: "https://example.com" } })).toBe(false);
    expect(cartItemRequestsPermanentHostedCode({ setup: { hostedPageCode: "ABC123" } as any })).toBe(true);
  });
});
