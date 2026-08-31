import { getProductMediaBucket, getProductMediaObject, getProductMediaUrl } from "@/lib/admin-media-storage";
import { brandedStandComposition, regionToPixels } from "@/lib/branded-composition";
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
  baseTemplateContentHash?: string;
  logoContentHash?: string;
  generatedAt: string;
  error?: string;
};

export type ProductionArtworkStorage = {
  put: (key: string, value: string, options: { contentType: string; metadata: Record<string, string> }) => Promise<void>;
};

export type EmbeddedProductionAsset = {
  dataUri: string;
  contentType: SupportedProductionAssetContentType;
  contentHash: string;
};

export type ProductionArtworkAssetResolver = (url: string) => Promise<EmbeddedProductionAsset>;

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
    const composed = await composeProductionArtworkDocument(input.item, template, approvalSnapshotHash, generatedAt, input.assetResolver);
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
  const businessName = readSetupString(item.setup, "businessName");
  const logoHref = readSetupString(item.setup, "logoMediaUrl");
  const qrTargetUrl = readSetupString(item.setup, "qrTargetUrl") ?? readSetupString(item.setup, "generatedQrValue");
  const fontSizePercent = readSetupNumber(item.setup, "fontSizePercent") ?? 100;
  const logoSizePercent = readSetupNumber(item.setup, "logoSizePercent") ?? 100;
  const logoFitMode = readSetupString(item.setup, "logoFitMode") === "fill" ? "fill" : "contain";
  const logoOffsetXPercent = readSetupNumber(item.setup, "logoOffsetXPercent") ?? 0;
  const logoOffsetYPercent = readSetupNumber(item.setup, "logoOffsetYPercent") ?? 0;

  if (!businessName) throw new Error("Business name is missing.");
  if (!logoHref) throw new Error("Logo media URL is missing.");
  if (!qrTargetUrl) throw new Error("QR target URL is missing.");

  const [baseTemplateAsset, logoAsset] = await Promise.all([
    assetResolver(template.templateUrl),
    assetResolver(logoHref)
  ]);

  const qrSvg = await createQrSvg(qrTargetUrl);
  const qrBody = extractSvgBody(qrSvg);
  const qrViewBox = extractViewBox(qrSvg) ?? "0 0 512 512";
  const nameFontSize = Math.round(fitSingleLineFontSize(businessName, template.businessNameRegion.width, 68, 26) * fontSizePercent / 100);
  const logoRegion = offsetRegion(scaleRegion(template.logoRegion, logoSizePercent), template.logoRegion, logoOffsetXPercent, logoOffsetYPercent);
  const logoPreserveAspectRatio = logoFitMode === "fill" ? "xMidYMid slice" : "xMidYMid meet";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${template.widthPx}" height="${template.heightPx}" viewBox="0 0 ${template.widthPx} ${template.heightPx}" role="img" aria-label="${escapeXml(item.title)} production artwork">`,
    `<title>${escapeXml(item.title)} production artwork</title>`,
    `<metadata>${escapeXml(stableJson({
      productId: item.productId,
      optionId: item.optionId,
      templateId: template.id,
      templateVersion: template.version,
      approvalSnapshotHash,
      generatedAt,
      qrTargetUrl,
      baseTemplateContentHash: baseTemplateAsset.contentHash,
      logoContentHash: logoAsset.contentHash
    }))}</metadata>`,
    `<rect width="${template.widthPx}" height="${template.heightPx}" fill="#ffffff"/>`,
    `<image href="${escapeXml(baseTemplateAsset.dataUri)}" x="0" y="0" width="${template.widthPx}" height="${template.heightPx}" preserveAspectRatio="xMidYMid meet"/>`,
    `<image href="${escapeXml(logoAsset.dataUri)}" x="${logoRegion.x}" y="${logoRegion.y}" width="${logoRegion.width}" height="${logoRegion.height}" preserveAspectRatio="${logoPreserveAspectRatio}"/>`,
    `<text x="${template.businessNameRegion.x + template.businessNameRegion.width / 2}" y="${template.businessNameRegion.y + template.businessNameRegion.height / 2}" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${nameFontSize}" font-weight="800" letter-spacing="0" fill="#111827" textLength="${Math.round(template.businessNameRegion.width * 0.96)}" lengthAdjust="spacingAndGlyphs">${escapeXml(businessName)}</text>`,
    `<svg x="${template.qrRegion.x}" y="${template.qrRegion.y}" width="${template.qrRegion.width}" height="${template.qrRegion.height}" viewBox="${escapeXml(qrViewBox)}">${qrBody}</svg>`,
    `</svg>`
  ].join("");

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
    destinationUrl: readSetupString(item.setup, "destinationUrl"),
    businessName: readSetupString(item.setup, "businessName"),
    logoStorageKey: readSetupString(item.setup, "logoStorageKey"),
    logoMediaUrl: readSetupString(item.setup, "logoMediaUrl"),
    generatedQrValue: readSetupString(item.setup, "generatedQrValue"),
    frontTemplateUrl: readSetupString(item.setup, "frontTemplateUrl"),
    fontSizePercent: readSetupNumber(item.setup, "fontSizePercent"),
    logoSizePercent: readSetupNumber(item.setup, "logoSizePercent"),
    logoBackgroundMode: readSetupString(item.setup, "logoBackgroundMode"),
    logoFitMode: readSetupString(item.setup, "logoFitMode"),
    logoOffsetXPercent: readSetupNumber(item.setup, "logoOffsetXPercent"),
    logoOffsetYPercent: readSetupNumber(item.setup, "logoOffsetYPercent")
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

type SupportedProductionAssetContentType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

const supportedProductionAssetTypes = new Set<string>(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

async function defaultProductionArtworkAssetResolver(url: string): Promise<EmbeddedProductionAsset> {
  if (url.startsWith("data:")) {
    return embedExistingDataUri(url);
  }

  const productMediaKey = readProductMediaKeyFromUrl(url);
  if (productMediaKey) {
    const object = await getProductMediaObject(productMediaKey);
    if (!object) throw new Error(`Production asset could not be found: ${url}`);
    const bytes = object.arrayBuffer ? await object.arrayBuffer() : object.body ? await new Response(object.body).arrayBuffer() : undefined;
    if (!bytes) throw new Error(`Production asset could not be read: ${url}`);
    return embedAssetBytes(bytes, object.httpMetadata?.contentType, url);
  }

  const response = await fetch(toAbsoluteAssetUrl(url));
  if (!response.ok) throw new Error(`Production asset could not be fetched: ${url}`);
  return embedAssetBytes(await response.arrayBuffer(), response.headers.get("content-type") ?? undefined, url);
}

async function embedExistingDataUri(url: string): Promise<EmbeddedProductionAsset> {
  const match = url.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) throw new Error("Production asset data URI must be base64 encoded.");

  const contentType = normalizeProductionAssetContentType(match[1], url);
  const bytes = base64ToBytes(match[2]);
  const safeBytes = contentType === "image/svg+xml" ? encodeUtf8(sanitizeSvgAsset(decodeUtf8(bytes), url)) : bytes;
  return {
    contentType,
    contentHash: await sha256HexFromBytes(safeBytes),
    dataUri: `data:${contentType};base64,${bytesToBase64(safeBytes)}`
  };
}

async function embedAssetBytes(bytes: ArrayBuffer, contentType: string | undefined, sourceUrl: string): Promise<EmbeddedProductionAsset> {
  const normalizedContentType = normalizeProductionAssetContentType(contentType ?? inferContentTypeFromUrl(sourceUrl), sourceUrl);
  const safeBytes = normalizedContentType === "image/svg+xml" ? encodeUtf8(sanitizeSvgAsset(decodeUtf8(bytes), sourceUrl)) : bytes;

  return {
    contentType: normalizedContentType,
    contentHash: await sha256HexFromBytes(safeBytes),
    dataUri: `data:${normalizedContentType};base64,${bytesToBase64(safeBytes)}`
  };
}

function readProductMediaKeyFromUrl(url: string) {
  const prefix = "/api/media/product/";
  if (url.startsWith(prefix)) return decodeURIComponent(url.slice(prefix.length));

  try {
    const parsed = new URL(url);
    const index = parsed.pathname.indexOf(prefix);
    return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + prefix.length)) : undefined;
  } catch {
    return undefined;
  }
}

function toAbsoluteAssetUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(url, siteUrl).toString();
}

function normalizeProductionAssetContentType(value: string | undefined, sourceUrl: string): SupportedProductionAssetContentType {
  const contentType = value?.split(";")[0]?.trim().toLowerCase() || inferContentTypeFromUrl(sourceUrl);
  if (contentType === "image/jpg") return "image/jpeg";
  if (supportedProductionAssetTypes.has(contentType)) return contentType as SupportedProductionAssetContentType;
  throw new Error(`Unsupported production asset type: ${contentType || sourceUrl}`);
}

function inferContentTypeFromUrl(url: string) {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "";
}

function sanitizeSvgAsset(svg: string, sourceUrl: string) {
  const lower = svg.toLowerCase();
  if (!lower.includes("<svg")) throw new Error(`SVG production asset is invalid: ${sourceUrl}`);
  if (/<script[\s>]/i.test(svg) || /<foreignobject[\s>]/i.test(svg) || /\son[a-z]+\s*=/i.test(svg) || /javascript:/i.test(svg)) {
    throw new Error(`SVG production asset contains unsafe content: ${sourceUrl}`);
  }
  return svg;
}

function bytesToBase64(bytes: ArrayBuffer) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  const view = new Uint8Array(bytes);
  for (let index = 0; index < view.length; index += 0x8000) {
    binary += String.fromCharCode(...view.slice(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(value, "base64");
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function encodeUtf8(value: string) {
  return new TextEncoder().encode(value).buffer;
}

function decodeUtf8(bytes: ArrayBuffer) {
  return new TextDecoder().decode(bytes);
}

function readSetupString(setup: OrderLineItem["setup"], key: string) {
  const value = setup?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSetupNumber(setup: OrderLineItem["setup"], key: string) {
  const value = setup?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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

function scaleRegion(region: ArtworkRegion, percent: number): ArtworkRegion {
  const clampedPercent = Math.min(160, Math.max(75, percent));
  const width = Math.round(region.width * clampedPercent / 100);
  const height = Math.round(region.height * clampedPercent / 100);

  return {
    x: Math.round(region.x + (region.width - width) / 2),
    y: Math.round(region.y + (region.height - height) / 2),
    width,
    height
  };
}

function offsetRegion(region: ArtworkRegion, originalRegion: ArtworkRegion, offsetXPercent: number, offsetYPercent: number): ArtworkRegion {
  return {
    ...region,
    x: Math.round(region.x + originalRegion.width * offsetXPercent / 100),
    y: Math.round(region.y + originalRegion.height * offsetYPercent / 100)
  };
}

function mergeWarningCodes(current: OrderLineItem["productionWarningCodes"], additions: OrderLineItem["productionWarningCodes"]) {
  return Array.from(new Set([...(current ?? []), ...(additions ?? [])]));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256HexFromBytes(value: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", value);
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
