import { defaultProductionArtworkAssetResolver, type EmbeddedProductionAsset, type ProductionArtworkAssetResolver } from "./production-artwork-assets";
export type { EmbeddedProductionAsset, ProductionArtworkAssetResolver } from "./production-artwork-assets";
import { getProductMediaBucket } from "@/lib/admin-media-storage";
import { brandedStandComposition, regionToPixels } from "@/lib/branded-composition";
import { getPrintLogoRegion, renderPrintArtwork } from "@/lib/print-artwork-renderer";
import { isProofApprovalSnapshotCurrent, type ProofApprovalSnapshot } from "@/lib/direct-production";
import type { OrderLineItem } from "@/lib/orders";

export type ArtworkRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProductionArtworkTemplate = {
  id: string;
  version: string;
  label: string;
  format: "svg";
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthIn: number;
  heightIn: number;
  templateUrl: string;
  logoRegion: ArtworkRegion;
  businessNameRegion: ArtworkRegion;
  qrRegion: ArtworkRegion;
  safeMarginPx: number;
};

export type ProductionArtworkReference = {
  status: "generated" | "generation_failed";
  storageKey?: string;
  url?: string;
  format: "svg";
  contentType: "image/svg+xml";
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthIn: number;
  heightIn: number;
  templateId: string;
  templateVersion: string;
  approvalSnapshotHash: string;
  baseTemplateContentHash?: string;
  logoContentHash?: string;
  generatedAt: string;
  error?: string;
};

export type ProductionArtworkStorage = {
  put: (key: string, value: string, options: { contentType: string; metadata: Record<string, string> }) => Promise<void>;
};

export type ProductionArtworkInput = {
  orderReference: string;
  lineItemIndex: number;
  item: OrderLineItem;
  assetResolver?: ProductionArtworkAssetResolver;
};

const standFrontTemplate: Omit<ProductionArtworkTemplate, "templateUrl"> = {
  id: brandedStandComposition.templateId,
  version: brandedStandComposition.templateVersion,
  label: "Tap Rater Branded Stand Front",
  format: "svg",
  widthPx: brandedStandComposition.widthPx,
  heightPx: brandedStandComposition.heightPx,
  dpi: brandedStandComposition.dpi,
  widthIn: brandedStandComposition.widthIn,
  heightIn: brandedStandComposition.heightIn,
  logoRegion: regionToPixels(brandedStandComposition.logoRegion),
  businessNameRegion: regionToPixels(brandedStandComposition.businessNameRegion),
  qrRegion: regionToPixels(brandedStandComposition.qrRegion),
  safeMarginPx: brandedStandComposition.safeMarginPx
};

export function getProductionArtworkTemplate(item: OrderLineItem): ProductionArtworkTemplate | null {
  if (item.optionId !== "branded_qr_direct") return null;

  const frontTemplateUrl = readSetupString(item.setup, "frontTemplateUrl");
  if (!frontTemplateUrl) return null;

  return {
    ...standFrontTemplate,
    templateUrl: frontTemplateUrl
  };
}

export async function generateProductionArtworkForOrderLineItem(
  input: ProductionArtworkInput,
  storage: ProductionArtworkStorage = defaultProductionArtworkStorage()
): Promise<OrderLineItem> {
  if (input.item.optionId !== "branded_qr_direct") {
    return input.item;
  }

  if (readSetupBoolean(input.item.setup, "designAssistanceRequested")) {
    return {
      ...input.item,
      logoStatus: input.item.logoReference ? input.item.logoStatus ?? "uploaded" : "manual_collection_required",
      proofApproved: false,
      productionStatus: "pending_manual_logo_and_proof",
      manualProductionRequired: true,
      productionWarningCodes: mergeWarningCodes(input.item.productionWarningCodes, ["pending_manual_proof", "do_not_print_until_manual_review"])
    };
  }

  const template = getProductionArtworkTemplate(input.item);
  const generatedAt = new Date().toISOString();

  try {
    if (!template) {
      throw new Error("Production artwork template metadata is missing.");
    }

    const proofApprovalSnapshot = readSetupRecord(input.item.setup, "proofApprovalSnapshot") as ProofApprovalSnapshot | undefined;
    const approvedConfiguration = buildCurrentApprovalSnapshot(input.item);

    if (!input.item.proofApproved || !proofApprovalSnapshot || !isProofApprovalSnapshotCurrent(approvedConfiguration, proofApprovalSnapshot)) {
      throw new Error("Approved configuration snapshot is missing or stale.");
    }

    const approvalSnapshotHash = await sha256Hex(stableJson(proofApprovalSnapshot));
    const existing = readProductionArtworkReference(input.item);
    if (existing?.status === "generated" && existing.storageKey && existing.approvalSnapshotHash === approvalSnapshotHash && existing.templateVersion === template.version) {
      return input.item;
    }
    const composed = await composeProductionArtworkDocument(input.item, template, approvalSnapshotHash, generatedAt, input.assetResolver);
    if (proofApprovalSnapshot.baseTemplateContentHash && proofApprovalSnapshot.baseTemplateContentHash !== composed.assetHashes.baseTemplateContentHash ||
        proofApprovalSnapshot.logoContentHash && proofApprovalSnapshot.logoContentHash !== composed.assetHashes.logoContentHash) {
      throw new Error("Approved artwork assets have changed. A new customer proof is required.");
    }
    const storageKey = buildProductionArtworkStorageKey(input.orderReference, input.lineItemIndex, input.item.productId, approvalSnapshotHash);

    await storage.put(storageKey, composed.svg, {
      contentType: "image/svg+xml",
      metadata: {
        orderReference: input.orderReference,
        productId: input.item.productId,
        optionId: input.item.optionId ?? "",
        templateId: template.id,
        templateVersion: template.version,
        approvalSnapshotHash,
        baseTemplateContentHash: composed.assetHashes.baseTemplateContentHash,
        logoContentHash: composed.assetHashes.logoContentHash
      }
    });

    const reference: ProductionArtworkReference = {
      status: "generated",
      storageKey,
      format: "svg",
      contentType: "image/svg+xml",
      widthPx: template.widthPx,
      heightPx: template.heightPx,
      dpi: template.dpi,
      widthIn: template.widthIn,
      heightIn: template.heightIn,
      templateId: template.id,
      templateVersion: template.version,
      approvalSnapshotHash,
      baseTemplateContentHash: composed.assetHashes.baseTemplateContentHash,
      logoContentHash: composed.assetHashes.logoContentHash,
      generatedAt
    };

    return {
      ...input.item,
      productionStatus: "ready_for_direct_fulfillment",
      manualProductionRequired: false,
      productionWarningCodes: [],
      setup: {
        ...input.item.setup,
        productionArtwork: reference
      }
    };
  } catch (error) {
    const fallbackHash = await sha256Hex(stableJson(readSetupRecord(input.item.setup, "proofApprovalSnapshot") ?? {}));
    const templateId = template?.id ?? "missing-template";
    const templateVersion = template?.version ?? "missing-template";
    const reference: ProductionArtworkReference = {
      status: "generation_failed",
      format: "svg",
      contentType: "image/svg+xml",
      widthPx: template?.widthPx ?? 0,
      heightPx: template?.heightPx ?? 0,
      dpi: template?.dpi ?? 0,
      widthIn: template?.widthIn ?? 0,
      heightIn: template?.heightIn ?? 0,
      templateId,
      templateVersion,
      approvalSnapshotHash: fallbackHash,
      generatedAt,
      error: error instanceof Error ? error.message : "Production artwork generation failed."
    };

    return {
      ...input.item,
      productionStatus: "artwork_generation_failed",
      manualProductionRequired: true,
      productionWarningCodes: mergeWarningCodes(input.item.productionWarningCodes, ["artwork_generation_failed"]),
      setup: {
        ...input.item.setup,
        productionArtwork: reference
      }
    };
  }
}

export async function composeProductionArtworkSvg(
  item: OrderLineItem,
  template: ProductionArtworkTemplate,
  approvalSnapshotHash: string,
  generatedAt: string,
  assetResolver?: ProductionArtworkAssetResolver
) {
  return (await composeProductionArtworkDocument(item, template, approvalSnapshotHash, generatedAt, assetResolver)).svg;
}

export async function composeProductionArtworkDocument(
  item: OrderLineItem,
  template: ProductionArtworkTemplate,
  approvalSnapshotHash: string,
  generatedAt: string,
  assetResolver: ProductionArtworkAssetResolver = defaultProductionArtworkAssetResolver
) {
  const businessName = readSetupString(item.setup, "businessName") ?? readProofPreviewString(item.setup, "businessName");
  const logoHref = readSetupString(item.setup, "logoMediaUrl") ?? readProofPreviewString(item.setup, "logoMediaUrl");
  const qrTargetUrl = readSetupString(item.setup, "qrTargetUrl") ?? readSetupString(item.setup, "generatedQrValue");
  const fontSizePercent = readSetupNumber(item.setup, "fontSizePercent") ?? readProofPreviewNumber(item.setup, "fontSizePercent") ?? 100;
  const logoSizePercent = readSetupNumber(item.setup, "logoSizePercent") ?? readProofPreviewNumber(item.setup, "logoSizePercent") ?? 100;
  const logoFitMode = (readSetupString(item.setup, "logoFitMode") ?? readProofPreviewString(item.setup, "logoFitMode")) === "fill" ? "fill" : "contain";
  const logoOffsetXPercent = readSetupNumber(item.setup, "logoOffsetXPercent") ?? readProofPreviewNumber(item.setup, "logoOffsetXPercent") ?? 0;
  const logoOffsetYPercent = readSetupNumber(item.setup, "logoOffsetYPercent") ?? readProofPreviewNumber(item.setup, "logoOffsetYPercent") ?? 0;
  const showBusinessNameOnProof = (readSetupOptionalBoolean(item.setup, "showBusinessNameOnProof") ?? readProofPreviewBoolean(item.setup, "showBusinessNameOnProof")) !== false;

  if (!businessName) throw new Error("Business name is missing.");
  if (!logoHref) throw new Error("Logo media URL is missing.");
  if (!qrTargetUrl) throw new Error("QR target URL is missing.");

  const [baseTemplateAsset, logoAsset] = await Promise.all([
    assetResolver(template.templateUrl),
    assetResolver(logoHref)
  ]);
  if (baseTemplateAsset.dimensions && (baseTemplateAsset.dimensions.width < template.widthPx || baseTemplateAsset.dimensions.height < template.heightPx)) {
    throw new Error("The stand template is below print resolution. Please contact Tap Rater.");
  }
  if (logoAsset.dimensions) {
    const region = getPrintLogoRegion(template.logoRegion, { logoSizePercent, logoOffsetXPercent, logoOffsetYPercent });
    const ratio = logoFitMode === "fill" ? Math.max(region.width / logoAsset.dimensions.width, region.height / logoAsset.dimensions.height) : Math.min(region.width / logoAsset.dimensions.width, region.height / logoAsset.dimensions.height);
    if (ratio > 1.01) throw new Error("The logo is too small for 300 DPI printing at this size. Upload a higher-resolution logo or reduce its size.");
  }

  const svg = await renderPrintArtwork({
    template,
    design: { businessName, qrTargetUrl, fontSizePercent, logoSizePercent, logoFitMode, logoOffsetXPercent, logoOffsetYPercent, showBusinessName: showBusinessNameOnProof },
    templateDataUri: baseTemplateAsset.dataUri,
    logoDataUri: logoAsset.dataUri,
    title: `${item.title} production artwork`,
    metadata: {
      productId: item.productId,
      optionId: item.optionId,
      templateId: template.id,
      templateVersion: template.version,
      approvalSnapshotHash,
      generatedAt,
      qrTargetUrl,
      baseTemplateContentHash: baseTemplateAsset.contentHash,
      logoContentHash: logoAsset.contentHash
    }
  });

  return {
    svg,
    assetHashes: {
      baseTemplateContentHash: baseTemplateAsset.contentHash,
      logoContentHash: logoAsset.contentHash
    }
  };
}

export function buildCurrentApprovalSnapshot(item: OrderLineItem): ProofApprovalSnapshot {
  return {
    productSlug: readSetupString(item.setup, "productSlug") ?? item.productId,
    optionCode: readSetupString(item.setup, "optionCode") ?? item.optionId,
    rendererVersion: readSetupString(item.setup, "rendererVersion"),
    baseTemplateContentHash: readSetupString(item.setup, "baseTemplateContentHash"),
    logoContentHash: readSetupString(item.setup, "logoContentHash"),
    destinationUrl: readSetupString(item.setup, "destinationUrl") ?? readProofPreviewString(item.setup, "destinationUrl"),
    businessName: readSetupString(item.setup, "businessName") ?? readProofPreviewString(item.setup, "businessName"),
    logoStorageKey: readSetupString(item.setup, "logoStorageKey") ?? readProofPreviewString(item.setup, "logoStorageKey"),
    logoMediaUrl: readSetupString(item.setup, "logoMediaUrl") ?? readProofPreviewString(item.setup, "logoMediaUrl"),
    generatedQrValue: readSetupString(item.setup, "generatedQrValue"),
    frontTemplateUrl: readSetupString(item.setup, "frontTemplateUrl") ?? readProofPreviewString(item.setup, "frontTemplateUrl"),
    fontSizePercent: readSetupNumber(item.setup, "fontSizePercent") ?? readProofPreviewNumber(item.setup, "fontSizePercent"),
    logoSizePercent: readSetupNumber(item.setup, "logoSizePercent") ?? readProofPreviewNumber(item.setup, "logoSizePercent"),
    showBusinessNameOnProof: readSetupOptionalBoolean(item.setup, "showBusinessNameOnProof") ?? readProofPreviewBoolean(item.setup, "showBusinessNameOnProof"),
    logoBackgroundMode: readSetupString(item.setup, "logoBackgroundMode") ?? readProofPreviewString(item.setup, "logoBackgroundMode"),
    logoFitMode: readSetupString(item.setup, "logoFitMode") ?? readProofPreviewString(item.setup, "logoFitMode"),
    logoOffsetXPercent: readSetupNumber(item.setup, "logoOffsetXPercent") ?? readProofPreviewNumber(item.setup, "logoOffsetXPercent"),
    logoOffsetYPercent: readSetupNumber(item.setup, "logoOffsetYPercent") ?? readProofPreviewNumber(item.setup, "logoOffsetYPercent")
  };
}

export function readProductionArtworkReference(item: OrderLineItem): ProductionArtworkReference | undefined {
  const value = readSetupRecord(item.setup, "productionArtwork");
  if (!value) return undefined;
  if (value.status !== "generated" && value.status !== "generation_failed") return undefined;
  if (value.format !== "svg" || value.contentType !== "image/svg+xml") return undefined;

  return value as ProductionArtworkReference;
}

function defaultProductionArtworkStorage(): ProductionArtworkStorage {
  return {
    async put(key, value, options) {
      const bucket = await getProductMediaBucket();
      if (!bucket) {
        throw new Error("Product media storage is not configured.");
      }

      await bucket.put(key, new TextEncoder().encode(value).buffer, {
        httpMetadata: {
          contentType: options.contentType,
          cacheControl: "private, max-age=31536000, immutable"
        },
        customMetadata: options.metadata
      });
    }
  };
}

function buildProductionArtworkStorageKey(orderReference: string, lineItemIndex: number, productId: string, approvalSnapshotHash: string) {
  return `products/${slugSegment(productId)}/production_artwork/${slugSegment(orderReference)}/line-${lineItemIndex + 1}-${approvalSnapshotHash.slice(0, 16)}.svg`;
}

function readSetupString(setup: OrderLineItem["setup"], key: string) {
  const value = setup?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSetupNumber(setup: OrderLineItem["setup"], key: string) {
  const value = setup?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readSetupBoolean(setup: OrderLineItem["setup"], key: string) {
  return setup?.[key] === true;
}

function readSetupOptionalBoolean(setup: OrderLineItem["setup"], key: string) {
  const value = setup?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readSetupRecord(setup: OrderLineItem["setup"], key: string): Record<string, unknown> | undefined {
  const value = setup?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readProofPreviewRecord(setup: OrderLineItem["setup"]) {
  return readSetupRecord(setup, "proofPreviewData");
}

function readProofPreviewString(setup: OrderLineItem["setup"], key: string) {
  const value = readProofPreviewRecord(setup)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readProofPreviewNumber(setup: OrderLineItem["setup"], key: string) {
  const value = readProofPreviewRecord(setup)?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readProofPreviewBoolean(setup: OrderLineItem["setup"], key: string) {
  const value = readProofPreviewRecord(setup)?.[key];
  return typeof value === "boolean" ? value : undefined;
}


function mergeWarningCodes(current: OrderLineItem["productionWarningCodes"], additions: OrderLineItem["productionWarningCodes"]) {
  return Array.from(new Set([...(current ?? []), ...(additions ?? [])]));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableJson(value: unknown) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([first], [second]) => first.localeCompare(second)).map(([key, entry]) => [key, sortObject(entry)]));
}

function slugSegment(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "item"
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
