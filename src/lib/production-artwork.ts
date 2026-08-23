import { getProductMediaBucket, getProductMediaUrl } from "@/lib/admin-media-storage";
import { createQrSvg } from "@/lib/qr-code";
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
};

const standFrontTemplate: Omit<ProductionArtworkTemplate, "templateUrl"> = {
  id: "taprater-branded-stand-front",
  version: "2026-08-23.1",
  label: "Tap Rater Branded Stand Front",
  format: "svg",
  widthPx: 1278,
  heightPx: 1949,
  dpi: 300,
  widthIn: 4.26,
  heightIn: 6.4967,
  logoRegion: percentRegion(1278, 1949, 13, 4.5, 74, 9.5),
  businessNameRegion: percentRegion(1278, 1949, 8, 17.1, 84, 6.5),
  qrRegion: squarePercentRegion(1278, 1949, 65.2, 73.1, 16.2),
  safeMarginPx: 64
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
    const svg = await composeProductionArtworkSvg(input.item, template, approvalSnapshotHash, generatedAt);
    const storageKey = buildProductionArtworkStorageKey(input.orderReference, input.lineItemIndex, input.item.productId, approvalSnapshotHash);

    await storage.put(storageKey, svg, {
      contentType: "image/svg+xml",
      metadata: {
        orderReference: input.orderReference,
        productId: input.item.productId,
        optionId: input.item.optionId ?? "",
        templateId: template.id,
        templateVersion: template.version,
        approvalSnapshotHash
      }
    });

    const reference: ProductionArtworkReference = {
      status: "generated",
      storageKey,
      url: getProductMediaUrl(storageKey),
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
  generatedAt: string
) {
  const businessName = readSetupString(item.setup, "businessName");
  const logoHref = readSetupString(item.setup, "logoMediaUrl");
  const qrTargetUrl = readSetupString(item.setup, "qrTargetUrl") ?? readSetupString(item.setup, "generatedQrValue");

  if (!businessName) throw new Error("Business name is missing.");
  if (!logoHref) throw new Error("Logo media URL is missing.");
  if (!qrTargetUrl) throw new Error("QR target URL is missing.");

  const qrSvg = await createQrSvg(qrTargetUrl);
  const qrBody = extractSvgBody(qrSvg);
  const qrViewBox = extractViewBox(qrSvg) ?? "0 0 512 512";
  const nameFontSize = fitSingleLineFontSize(businessName, template.businessNameRegion.width, 42, 22);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${template.widthPx}" height="${template.heightPx}" viewBox="0 0 ${template.widthPx} ${template.heightPx}" role="img" aria-label="${escapeXml(item.title)} production artwork">`,
    `<title>${escapeXml(item.title)} production artwork</title>`,
    `<metadata>${escapeXml(stableJson({
      productId: item.productId,
      optionId: item.optionId,
      templateId: template.id,
      templateVersion: template.version,
      approvalSnapshotHash,
      generatedAt,
      qrTargetUrl
    }))}</metadata>`,
    `<rect width="${template.widthPx}" height="${template.heightPx}" fill="#ffffff"/>`,
    `<image href="${escapeXml(template.templateUrl)}" x="0" y="0" width="${template.widthPx}" height="${template.heightPx}" preserveAspectRatio="xMidYMid meet"/>`,
    `<image href="${escapeXml(logoHref)}" x="${template.logoRegion.x}" y="${template.logoRegion.y}" width="${template.logoRegion.width}" height="${template.logoRegion.height}" preserveAspectRatio="xMidYMid meet"/>`,
    `<text x="${template.businessNameRegion.x + template.businessNameRegion.width / 2}" y="${template.businessNameRegion.y + template.businessNameRegion.height / 2}" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${nameFontSize}" font-weight="800" letter-spacing="0" fill="#111827" textLength="${Math.round(template.businessNameRegion.width * 0.96)}" lengthAdjust="spacingAndGlyphs">${escapeXml(businessName.toUpperCase())}</text>`,
    `<svg x="${template.qrRegion.x}" y="${template.qrRegion.y}" width="${template.qrRegion.width}" height="${template.qrRegion.height}" viewBox="${escapeXml(qrViewBox)}">${qrBody}</svg>`,
    `</svg>`
  ].join("");
}

export function buildCurrentApprovalSnapshot(item: OrderLineItem): ProofApprovalSnapshot {
  return {
    productSlug: readSetupString(item.setup, "productSlug") ?? item.productId,
    optionCode: readSetupString(item.setup, "optionCode") ?? item.optionId,
    destinationUrl: readSetupString(item.setup, "destinationUrl"),
    businessName: readSetupString(item.setup, "businessName"),
    logoStorageKey: readSetupString(item.setup, "logoStorageKey"),
    logoMediaUrl: readSetupString(item.setup, "logoMediaUrl"),
    generatedQrValue: readSetupString(item.setup, "generatedQrValue"),
    frontTemplateUrl: readSetupString(item.setup, "frontTemplateUrl")
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

function percentRegion(widthPx: number, heightPx: number, x: number, y: number, width: number, height: number): ArtworkRegion {
  return {
    x: Math.round((x / 100) * widthPx),
    y: Math.round((y / 100) * heightPx),
    width: Math.round((width / 100) * widthPx),
    height: Math.round((height / 100) * heightPx)
  };
}

function squarePercentRegion(widthPx: number, heightPx: number, x: number, y: number, size: number): ArtworkRegion {
  const side = Math.round((size / 100) * widthPx);
  return {
    x: Math.round((x / 100) * widthPx),
    y: Math.round((y / 100) * heightPx),
    width: side,
    height: side
  };
}

function buildProductionArtworkStorageKey(orderReference: string, lineItemIndex: number, productId: string, approvalSnapshotHash: string) {
  return `products/${slugSegment(productId)}/production_artwork/${slugSegment(orderReference)}/line-${lineItemIndex + 1}-${approvalSnapshotHash.slice(0, 16)}.svg`;
}

function readSetupString(setup: OrderLineItem["setup"], key: string) {
  const value = setup?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSetupRecord(setup: OrderLineItem["setup"], key: string): Record<string, unknown> | undefined {
  const value = setup?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function extractSvgBody(svg: string) {
  return svg.replace(/^.*?<svg[^>]*>/s, "").replace(/<\/svg>\s*$/s, "");
}

function extractViewBox(svg: string) {
  return svg.match(/viewBox="([^"]+)"/)?.[1];
}

function fitSingleLineFontSize(text: string, maxWidthPx: number, maxFontPx: number, minFontPx: number) {
  const estimatedWidthAtMax = text.length * maxFontPx * 0.62;
  if (estimatedWidthAtMax <= maxWidthPx * 0.96) return maxFontPx;
  return Math.max(minFontPx, Math.floor((maxWidthPx * 0.96) / Math.max(1, text.length * 0.62)));
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
