import { describe, expect, it } from "vitest";
import {
  composeProductionArtworkSvg,
  generateProductionArtworkForOrderLineItem,
  getProductionArtworkTemplate,
  readProductionArtworkReference,
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

describe("production artwork", () => {
  it("selects a deterministic branded stand template and version", () => {
    const template = getProductionArtworkTemplate(brandedItem);

    expect(template).toMatchObject({
      id: "taprater-branded-stand-front",
      version: "2026-08-23.1",
      format: "svg",
      widthPx: 1278,
      heightPx: 1949,
      dpi: 300,
      templateUrl: "/api/media/product/products/google-review/front-template.png"
    });
  });

  it("generates SVG artwork from the approved snapshot and stores a durable reference", async () => {
    const { storage, writes } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem }, storage);
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
      templateVersion: "2026-08-23.1"
    });
    expect(artwork?.storageKey).toContain("products/google-review-stand/production_artwork/cs-test-123/line-1-");
    expect(artwork?.url).toContain("/api/media/product/products/google-review-stand/production_artwork/cs-test-123/line-1-");
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
      templateVersion: "2026-08-23.1",
      approvalSnapshotHash: artwork?.approvalSnapshotHash
    });
    expect(stored?.value).toContain("NOVA IMPLANT");
    expect(stored?.value).toContain("https://g.page/example/review");
    expect(stored?.value).toContain("/api/media/product/products/customer-setup/logo.png");
    expect(stored?.value).toContain("/api/media/product/products/google-review/front-template.png");
  });

  it("does not alter the approved NFC target while generating artwork", async () => {
    const { storage } = memoryStorage();
    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem }, storage);

    expect(item.setup?.nfcTargetUrl).toBe("https://g.page/example/review");
    expect(item.setup?.qrTargetUrl).toBe("https://g.page/example/review");
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

    const item = await generateProductionArtworkForOrderLineItem({ orderReference: "cs_test_123", lineItemIndex: 0, item: brandedItem }, failingStorage);
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

    const first = await composeProductionArtworkSvg(brandedItem, template, "snapshot-hash", "2026-08-23T14:00:00.000Z");
    const second = await composeProductionArtworkSvg(brandedItem, template, "snapshot-hash", "2026-08-23T14:00:00.000Z");

    expect(second).toBe(first);
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
