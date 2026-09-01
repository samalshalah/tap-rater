import { describe, expect, it } from "vitest";
import { brandedStandComposition, regionToPixels } from "@/lib/branded-composition";
import {
  composeProductionArtworkSvg,
  generateProductionArtworkForOrderLineItem,
  getProductionArtworkTemplate,
  readProductionArtworkReference,
  type EmbeddedProductionAsset,
  type ProductionArtworkAssetResolver,
  type ProductionArtworkStorage
} from "@/lib/production-artwork";
import type { OrderLineItem } from "@/lib/orders";

const approvedSnapshot = {
  productSlug: "google-review-stand",
  optionCode: "branded_qr_direct",
  destinationUrl: "https://g.page/example/review",
  businessName: "Nova Implant",
  logoStorageKey: "products/customer-setup/logo.png",
  logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
  generatedQrValue: "https://g.page/example/review",
  frontTemplateUrl: "/api/media/product/products/google-review/front-template.png"
};

const brandedItem: OrderLineItem = {
  productId: "google-review-stand",
  optionId: "branded_qr_direct",
  optionLabel: "Branded + QR Direct Stand",
  destinationMode: "DIRECT",
  customizationLevel: "BRANDED",
  title: "Google Review Stand",
  sku: "GRS",
  quantity: 1,
  unitAmountCents: 4900,
  lineSubtotalCents: 4900,
  setup: {
    productSlug: "google-review-stand",
    optionCode: "branded_qr_direct",
    destinationUrl: "https://g.page/example/review",
    businessName: "Nova Implant",
    logoStorageKey: "products/customer-setup/logo.png",
    logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
    generatedQrValue: "https://g.page/example/review",
    qrTargetUrl: "https://g.page/example/review",
    nfcTargetUrl: "https://g.page/example/review",
    frontTemplateUrl: "/api/media/product/products/google-review/front-template.png",
    proofApprovalSnapshot: approvedSnapshot,
    proofApprovedAt: "2026-08-23T14:00:00.000Z",
    proofPreviewData: {
      productTitle: "Google Review Stand",
      businessName: "Nova Implant",
      logoMediaUrl: "/api/media/product/products/customer-setup/logo.png",
      qrValue: "https://g.page/example/review",
      frontTemplateUrl: "/api/media/product/products/google-review/front-template.png"
    }
  },
  logoRequired: true,
  logoStatus: "uploaded",
  logoReference: "products/customer-setup/logo.png",
  proofRequired: true,
  proofApproved: true,
  productionStatus: "ready_for_direct_fulfillment",
  manualProductionRequired: false,
  productionWarningCodes: []
};

function memoryStorage() {
  const writes = new Map<string, { value: string; contentType: string; metadata: Record<string, string> }>();
  const storage: ProductionArtworkStorage = {
    async put(key, value, options) {
      writes.set(key, { value, contentType: options.contentType, metadata: options.metadata });
    }
  };

  return { storage, writes };
}

const embeddedAssets: Record<string, EmbeddedProductionAsset> = {
  "/api/media/product/products/google-review/front-template.png": {
    dataUri: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L3N2Zz4=",
    contentType: "image/svg+xml",
    contentHash: "base-template-hash"
  },
  "/api/media/product/products/customer-setup/logo.png": {
    dataUri: "data:image/png;base64,iVBORw0KGgo=",
    contentType: "image/png",
    contentHash: "logo-hash"
  }
};

const memoryAssetResolver: ProductionArtworkAssetResolver = async (url) => {
  const asset = embeddedAssets[url];
  if (!asset) throw new Error(`Missing test asset: ${url}`);
  return asset;
};

describe("production artwork", () => {
  it("selects a deterministic branded stand template and version", () => {
    const template = getProductionArtworkTemplate(brandedItem);

    expect(template).toMatchObject({
      id: "taprater-branded-stand-front",
      version: "2026-08-31.1",
      format: "svg",
      widthPx: 1278,
      heightPx: 1949,
      dpi: 300,
      templateUrl: "/api/media/product/products/google-review/front-template.png"
    });
  });

  it("keeps production geometry sourced from the owner-defined dynamic zones", () => {
    const template = getProductionArtworkTemplate(brandedItem);

    expect(template).toMatchObject({
      id: brandedStandComposition.templateId,
      version: brandedStandComposition.templateVersion,
      widthPx: brandedStandComposition.widthPx,
      heightPx: brandedStandComposition.heightPx,
      dpi: brandedStandComposition.dpi,
      logoRegion: { x: 335, y: 95, width: 610, height: 140 },
      businessNameRegion: { x: 286, y: 380, width: 706, height: 85 },
      qrRegion: { x: 790, y: 1331, width: 288, height: 288 }
    });
    expect(regionToPixels(brandedStandComposition.logoRegion)).toMatchObject({ x: 335, y: 95, width: 610, height: 140 });
  });

  it("generates self-contained SVG artwork from only template, logo, business name, and QR", async () => {
    const { storage, writes } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem, assetResolver: memoryAssetResolver }, storage);
    const artwork = readProductionArtworkReference(item);

    expect(artwork).toMatchObject({
      status: "generated",
      format: "svg",
      contentType: "image/svg+xml",
      widthPx: 1278,
      heightPx: 1949,
      dpi: 300,
      widthIn: 4.26,
      templateId: "taprater-branded-stand-front",
      templateVersion: "2026-08-31.1",
      baseTemplateContentHash: "base-template-hash",
      logoContentHash: "logo-hash"
    });
    expect(artwork).not.toHaveProperty("centerAssetContentHash");
    expect(artwork?.storageKey).toContain("products/google-review-stand/production_artwork/cs-test-123/line-1-");
    expect(item.productionStatus).toBe("ready_for_direct_fulfillment");
    expect(item.manualProductionRequired).toBe(false);
    expect(item.productionWarningCodes).toEqual([]);

    const stored = writes.get(artwork?.storageKey ?? "");
    expect(stored?.contentType).toBe("image/svg+xml");
    expect(stored?.metadata).toMatchObject({
      orderReference: "cs_test_123",
      productId: "google-review-stand",
      optionId: "branded_qr_direct",
      templateId: "taprater-branded-stand-front",
      templateVersion: "2026-08-31.1",
      approvalSnapshotHash: artwork?.approvalSnapshotHash,
      baseTemplateContentHash: "base-template-hash",
      logoContentHash: "logo-hash"
    });
    expect(stored?.metadata).not.toHaveProperty("centerAssetContentHash");
    expect(stored?.value).toContain("Nova Implant");
    expect(stored?.value).toContain("https://g.page/example/review");
    expect(stored?.value).toContain(embeddedAssets["/api/media/product/products/customer-setup/logo.png"].dataUri);
    expect(stored?.value).toContain(embeddedAssets["/api/media/product/products/google-review/front-template.png"].dataUri);
    expect(stored?.value).not.toContain("Review us on Google</text>");
    expect(stored?.value).not.toContain('href="/api/media/product');
    expect(stored?.value).toContain("<svg x=");
  });

  it("omits the separate business name text when the approved proof hides it", async () => {
    const { storage, writes } = memoryStorage();
    const itemWithLogoOnlyName: OrderLineItem = {
      ...brandedItem,
      setup: {
        ...brandedItem.setup,
        showBusinessNameOnProof: false,
        proofApprovalSnapshot: {
          ...approvedSnapshot,
          showBusinessNameOnProof: false
        }
      }
    };
    const item = await generateProductionArtworkForOrderLineItem(
      { orderReference: "cs_test_123", lineItemIndex: 0, item: itemWithLogoOnlyName, assetResolver: memoryAssetResolver },
      storage
    );
    const artwork = readProductionArtworkReference(item);
    const stored = writes.get(artwork?.storageKey ?? "");

    expect(artwork?.status).toBe("generated");
    expect(stored?.value).not.toContain("Nova Implant</text>");
    expect(stored?.value).toContain(embeddedAssets["/api/media/product/products/customer-setup/logo.png"].dataUri);
  });

  it("uses approved proof preview controls when checkout setup root fields are missing", async () => {
    const { storage, writes } = memoryStorage();
    const itemWithPreviewOnlyControls: OrderLineItem = {
      ...brandedItem,
      setup: {
        ...brandedItem.setup,
        fontSizePercent: undefined,
        logoSizePercent: undefined,
        showBusinessNameOnProof: undefined,
        logoFitMode: undefined,
        logoOffsetXPercent: undefined,
        logoOffsetYPercent: undefined,
        proofPreviewData: {
          ...(brandedItem.setup?.proofPreviewData as Record<string, unknown>),
          fontSizePercent: 80,
          logoSizePercent: 125,
          showBusinessNameOnProof: false,
          logoFitMode: "contain",
          logoOffsetXPercent: -4,
          logoOffsetYPercent: 3
        },
        proofApprovalSnapshot: {
          ...approvedSnapshot,
          fontSizePercent: 80,
          logoSizePercent: 125,
          showBusinessNameOnProof: false,
          logoFitMode: "contain",
          logoOffsetXPercent: -4,
          logoOffsetYPercent: 3
        }
      }
    };

    const item = await generateProductionArtworkForOrderLineItem(
      { orderReference: "cs_test_123", lineItemIndex: 0, item: itemWithPreviewOnlyControls, assetResolver: memoryAssetResolver },
      storage
    );
    const artwork = readProductionArtworkReference(item);
    const stored = writes.get(artwork?.storageKey ?? "");

    expect(artwork?.status).toBe("generated");
    expect(item.productionStatus).toBe("ready_for_direct_fulfillment");
    expect(stored?.value).not.toContain("Nova Implant</text>");
  });

  it("keeps QR and NFC targets identical to the Direct destination", async () => {
    const { storage } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem, assetResolver: memoryAssetResolver }, storage);

    expect(item.setup?.nfcTargetUrl).toBe("https://g.page/example/review");
    expect(item.setup?.qrTargetUrl).toBe("https://g.page/example/review");
  });

  it("keeps design assistance orders in manual proof review instead of generating artwork", async () => {
    const { storage, writes } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem(
      {
        orderReference: "cs_test_123",
        lineItemIndex: 0,
        item: {
          ...brandedItem,
          setup: {
            ...brandedItem.setup,
            designAssistanceRequested: true,
            manualCollectionAcknowledged: true,
            logoMediaUrl: undefined,
            logoStorageKey: undefined,
            proofApprovalSnapshot: undefined,
            proofPreviewData: undefined
          },
          logoStatus: "manual_collection_required",
          logoReference: null,
          proofApproved: false,
          productionStatus: "pending_manual_logo_and_proof",
          manualProductionRequired: true
        }
      },
      storage
    );

    expect(writes.size).toBe(0);
    expect(item.productionStatus).toBe("pending_manual_logo_and_proof");
    expect(item.manualProductionRequired).toBe(true);
    expect(item.productionWarningCodes).toEqual(["pending_manual_proof", "do_not_print_until_manual_review"]);
    expect(readProductionArtworkReference(item)).toBeUndefined();
  });

  it("rejects stale or unapproved configurations with an operational failure state", async () => {
    const { storage } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem(
      {
        orderReference: "cs_test_123",
        lineItemIndex: 0,
        item: {
          ...brandedItem,
          setup: {
            ...brandedItem.setup,
            businessName: "Changed Business"
          }
        }
      },
      storage
    );
    const artwork = readProductionArtworkReference(item);

    expect(artwork).toMatchObject({
      status: "generation_failed",
      error: "Approved configuration snapshot is missing or stale."
    });
    expect(item.productionStatus).toBe("artwork_generation_failed");
    expect(item.manualProductionRequired).toBe(true);
    expect(item.productionWarningCodes).toContain("artwork_generation_failed");
  });

  it("does not mark generation failures ready for production", async () => {
    const failingStorage: ProductionArtworkStorage = {
      async put() {
        throw new Error("R2 unavailable");
      }
    };

    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem, assetResolver: memoryAssetResolver }, failingStorage);
    const artwork = readProductionArtworkReference(item);

    expect(artwork).toMatchObject({
      status: "generation_failed",
      error: "R2 unavailable"
    });
    expect(item.productionStatus).toBe("artwork_generation_failed");
    expect(item.manualProductionRequired).toBe(true);
  });

  it("regenerates an equivalent composition from the same approved data", async () => {
    const template = getProductionArtworkTemplate(brandedItem);
    if (!template) throw new Error("Expected template");

    const first = await composeProductionArtworkSvg(brandedItem, template, "snapshot-hash", "2026-08-23T14:00:00.000Z", memoryAssetResolver);
    const second = await composeProductionArtworkSvg(brandedItem, template, "snapshot-hash", "2026-08-23T14:00:00.000Z", memoryAssetResolver);

    expect(second).toBe(first);
  });

  it.each([
    ["base asset", "/api/media/product/products/google-review/front-template.png"],
    ["logo asset", "/api/media/product/products/customer-setup/logo.png"]
  ])("fails safely when the %s cannot be embedded", async (_, missingUrl) => {
    const { storage } = memoryStorage();
    const assetResolver: ProductionArtworkAssetResolver = async (url) => {
      if (url === missingUrl) throw new Error(`Missing test asset: ${url}`);
      return memoryAssetResolver(url);
    };

    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem, assetResolver }, storage);
    const artwork = readProductionArtworkReference(item);

    expect(artwork).toMatchObject({
      status: "generation_failed",
      error: `Missing test asset: ${missingUrl}`
    });
    expect(item.productionStatus).toBe("artwork_generation_failed");
    expect(item.manualProductionRequired).toBe(true);
  });

  it("fails safely when the front template metadata is missing", async () => {
    const { storage } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem(
      {
        orderReference: "cs_test_123",
        lineItemIndex: 0,
        item: {
          ...brandedItem,
          setup: {
            ...brandedItem.setup,
            frontTemplateUrl: undefined
          }
        }
      },
      storage
    );

    expect(readProductionArtworkReference(item)).toMatchObject({
      status: "generation_failed",
      error: "Production artwork template metadata is missing."
    });
  });

  it("does not fetch or render legacy center asset and CTA values", async () => {
    const template = getProductionArtworkTemplate(brandedItem);
    if (!template) throw new Error("Expected template");

    const svg = await composeProductionArtworkSvg(
      {
        ...brandedItem,
        setup: {
          ...brandedItem.setup,
          centerAssetUrl: "/api/media/product/products/google-review/center/google.svg",
          ctaText: "Review us on Google"
        }
      },
      template,
      "snapshot-hash",
      "2026-08-23T14:00:00.000Z",
      memoryAssetResolver
    );

    expect(svg).not.toContain("center/google.svg");
    expect(svg).not.toContain("Review us on Google</text>");
  });

  it("leaves Standard Direct independent of production artwork and HOSTED infrastructure", async () => {
    const { storage, writes } = memoryStorage();
    const standardItem: OrderLineItem = {
      productId: "google-review-stand",
      optionId: "standard_direct",
      optionLabel: "Standard Direct Stand",
      title: "Google Review Stand",
      sku: "GRS",
      quantity: 1,
      unitAmountCents: 3900,
      lineSubtotalCents: 3900,
      setup: {
        destinationUrl: "https://g.page/example/review",
        qrTargetUrl: "https://g.page/example/review",
        nfcTargetUrl: "https://g.page/example/review"
      }
    };

    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: standardItem }, storage);

    expect(item).toBe(standardItem);
    expect(writes.size).toBe(0);
  });
});
