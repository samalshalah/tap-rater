import { isSafeProductMediaKey } from "@/lib/admin-media-storage";
import type { OrderLineItem, OrderRecord } from "@/lib/orders";

export type OrderDesignAsset = "original-logo" | "print-logo" | "text";

export function getAdminOrderDesignAssetUrl(order: Pick<OrderRecord, "id">, index: number, asset: OrderDesignAsset) {
  return order.id && Number.isSafeInteger(index) && index >= 0
    ? `/api/admin/orders/${encodeURIComponent(order.id)}/assets/${index}?asset=${asset}`
    : undefined;
}

export function getOrderLogoStorageKey(item: OrderLineItem, original = true) {
  const current = readText(item, "logoStorageKey") || readText(item, "logoMediaUrl") || item.logoReference || "";
  const reference = original ? readText(item, "originalLogoStorageKey") || readText(item, "originalLogoMediaUrl") || current : current;
  let key = reference;
  if (!key.startsWith("products/")) {
    try {
      const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com");
      const url = new URL(reference, site);
      if (url.origin !== site.origin || !url.pathname.startsWith("/api/media/product/") || url.search || url.hash) return undefined;
      key = decodeURIComponent(url.pathname.slice("/api/media/product/".length));
    } catch { return undefined; }
  }
  const uploadFolder = `customer-setup-${item.productId}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
  const parts = key.split("/");
  return isSafeProductMediaKey(key) && parts.length === 4 && parts[1] === uploadFolder && parts[2] === "center_asset" && /\.(png|jpe?g|webp)$/i.test(parts[3])
    ? key : undefined;
}

export function buildOrderDesignText(order: Pick<OrderRecord, "id">, item: OrderLineItem, index: number) {
  const printedQr = item.optionId === "branded_qr_direct";
  const value = (key: string) => readText(item, key) || "Not provided";
  const percent = (key: string, fallback: number) => typeof item.setup?.[key] === "number" ? item.setup[key] : fallback;
  return [
    "Tap Rater - Customer design details",
    `Order: ${order.id ?? "Not assigned"}`,
    `Item: ${index + 1}`,
    `Product: ${item.title}`,
    `SKU: ${item.sku}`,
    `Quantity: ${item.quantity}`,
    "",
    `Business name: ${value("businessName")}`,
    `Business name printed: ${printedQr && item.setup?.showBusinessNameOnProof !== false ? "Yes" : "No"}`,
    `Business name size: ${percent("fontSizePercent", 100)}%`,
    `Logo size: ${percent("logoSizePercent", 100)}%`,
    `Logo fit: ${readText(item, "logoFitMode") || "contain"}`,
    `Logo horizontal offset: ${percent("logoOffsetXPercent", 0)}%`,
    `Logo vertical offset: ${percent("logoOffsetYPercent", 0)}%`,
    `Destination URL: ${value("destinationUrl")}`,
    `QR destination: ${printedQr ? readText(item, "qrTargetUrl") || readText(item, "generatedQrValue") || value("destinationUrl") : "No printed QR"}`,
    `NFC destination: ${readText(item, "nfcTargetUrl") || value("destinationUrl")}`,
    `Artwork approved: ${item.proofApproved ? "Yes" : "No"}`,
    "",
    "Design notes:",
    readText(item, "designNotes") || "None",
    "",
    "These are the submitted design details, not a production approval or print file.",
    ""
  ].join("\r\n");
}

function readText(item: OrderLineItem, key: string) {
  const value = item.setup?.[key];
  return typeof value === "string" && value.trim() ? value : "";
}
