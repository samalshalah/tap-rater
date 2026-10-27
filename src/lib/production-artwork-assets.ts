import { getProductMediaObject, readImageDimensions } from "@/lib/admin-media-storage";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type EmbeddedProductionAsset = {
  dimensions?: { width: number; height: number };
  dataUri: string;
  contentType: SupportedProductionAssetContentType;
  contentHash: string;
};

export type ProductionArtworkAssetResolver = (url: string) => Promise<EmbeddedProductionAsset>;

type SupportedProductionAssetContentType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

const supportedProductionAssetTypes = new Set<string>(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function defaultProductionArtworkAssetResolver(url: string): Promise<EmbeddedProductionAsset> {
  if (url.startsWith("data:")) {
    return embedExistingDataUri(url);
  }

  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com");
  const parsed = new URL(url, siteUrl);
  const mediaBase = process.env.PRODUCT_MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const trustedMediaUrl = mediaBase && url.startsWith(`${mediaBase}/products/`);
  if (!trustedMediaUrl && parsed.origin !== siteUrl.origin) throw new Error("Production assets must belong to Tap Rater.");
  const productMediaKey = trustedMediaUrl ? decodeURIComponent(url.slice(mediaBase.length + 1)) : readProductMediaKeyFromUrl(url);
  if (productMediaKey) {
    const object = await getProductMediaObject(productMediaKey);
    if (!object) throw new Error(`Production asset could not be found: ${url}`);
    const bytes = object.arrayBuffer ? await object.arrayBuffer() : object.body ? await new Response(object.body).arrayBuffer() : undefined;
    if (!bytes) throw new Error(`Production asset could not be read: ${url}`);
    return embedAssetBytes(bytes, object.httpMetadata?.contentType, url);
  }

  if (!parsed.pathname.startsWith("/uploads/products/") || parsed.pathname.includes("..") || parsed.pathname.includes("%") || parsed.pathname.includes("\\")) {
    throw new Error("Production template path is not allowed.");
  }
  if (process.env.NODE_ENV !== "production") {
    const buffer = await readFile(join(process.cwd(), "public", parsed.pathname));
    return embedAssetBytes(Uint8Array.from(buffer).buffer, undefined, parsed.pathname);
  }
  let assets: CloudflareEnv["ASSETS"];
  try {
    assets = (await getCloudflareContext({ async: true })).env.ASSETS;
  } catch { /* Static fetch is also supported outside Workers. */ }
  const response = assets ? await assets.fetch(parsed.toString()) : await fetch(parsed, { redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Production asset could not be fetched: ${url}`);
  if (Number(response.headers.get("content-length")) > 10 * 1024 * 1024) throw new Error("Production asset is too large.");
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
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Production asset is too large.");
  const normalizedContentType = normalizeProductionAssetContentType(contentType ?? inferContentTypeFromUrl(sourceUrl), sourceUrl);
  const safeBytes = normalizedContentType === "image/svg+xml" ? encodeUtf8(sanitizeSvgAsset(decodeUtf8(bytes), sourceUrl)) : bytes;
  const dimensions = normalizedContentType === "image/svg+xml" ? undefined : readImageDimensions(safeBytes, normalizedContentType);
  if (normalizedContentType !== "image/svg+xml" && !dimensions) throw new Error("Production image dimensions could not be verified.");

  return {
    contentType: normalizedContentType,
    dimensions: dimensions ?? undefined,
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
  if (/<script[\s>]/i.test(svg) || /<foreignobject[\s>]/i.test(svg) || /\son[a-z]+\s*=/i.test(svg) || /javascript:/i.test(svg) || /<!DOCTYPE|<!ENTITY|@import|url\s*\(/i.test(svg) || /(?:href|src)\s*=\s*["'](?!#|data:image\/)/i.test(svg)) {
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
    binary += String.fromCharCode(...view.subarray(index, index + 0x8000));
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

async function sha256HexFromBytes(value: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
