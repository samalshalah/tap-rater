import type { MigratedProduct } from "@/data/migrated-products";
import type { OffersSettings } from "@/lib/offers";
import { singleStandPrice } from "@/lib/offers";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { generateProductVariantSku, getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultPurchasableProductSize, getProductBaseSku } from "@/lib/product-model";
import { isPublicLaunchStorefrontProduct } from "@/lib/product-repository";
import { getProductVisual } from "@/lib/storefront-visuals";
import { getPublicSiteUrl } from "@/lib/public-site-url";

function xml(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const tag = (name: string, value: string) => `<g:${name}>${xml(value)}</g:${name}>`;

/** A complete, public-only snapshot. No customer artwork or order data belongs here. */
export function buildMerchantFeed(products: MigratedProduct[], offers: OffersSettings) {
  const origin = getPublicSiteUrl();
  const absolute = (path: string) => new URL(path, origin).toString();
  const ids = new Set<string>();
  const items = products.filter(isPublicLaunchStorefrontProduct).flatMap((product) => {
    const selection = {
      sizeCode: getDefaultPurchasableProductSize(product)?.code,
      colorCode: getDefaultProductColor(product)?.code,
    };
    return getProductPurchaseOptions(product).flatMap((option) => {
      const basePrice = getConfiguredUnitPriceCents(product, option, selection);
      if (option.requiresSubscription || basePrice === null || !Number.isFinite(basePrice) || basePrice <= 0) return [];
      const branded = option.id === "branded_qr_direct";
      const image = (branded ? product.assetSet?.brandedAngledImageUrl : undefined) ?? getProductVisual(product).src;
      if (!image) throw new Error(`Missing merchant image for ${product.slug}`);
      const sku = generateProductVariantSku(product, { ...selection, purchaseOptionId: option.id });
      // Preserve IDs already discovered by Google's ProductGroup crawler.
      const discoveredId = `${getProductBaseSku(product)}_${sku.toLowerCase()}`;
      const id = discoveredId.length <= 50 ? discoveredId : sku;
      if (id.length > 50 || ids.has(id)) throw new Error("Invalid or duplicate merchant product ID");
      ids.add(id);
      const price = singleStandPrice(product.slug, option.id, basePrice, offers);
      if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid merchant price");
      const fields = [
        tag("id", id),
        tag("title", `${product.title} - ${branded ? "Branded" : "Standard"}`.slice(0, 150)),
        tag("description", `${product.shortDescription} ${option.summary}`.trim().slice(0, 5000)),
        tag("link", absolute(`/product/${product.slug}?design=${branded ? "branded" : "standard"}`)),
        tag("image_link", absolute(image)),
        tag("availability", "in_stock"),
        tag("condition", "new"),
        tag("price", `${(basePrice / 100).toFixed(2)} USD`),
        ...(price < basePrice ? [tag("sale_price", `${(price / 100).toFixed(2)} USD`)] : []),
        tag("brand", "Tap Rater"),
        tag("mpn", sku),
        tag("product_type", "Business Supplies > NFC Countertop Stands"),
        ...(branded ? [tag("return_policy_label", "custom-branded")] : []),
      ];
      // Design customization is not a supported item_group_id variant attribute.
      return [`<item>\n${fields.join("\n")}\n</item>`];
    });
  });
  if (!items.length) throw new Error("Merchant catalog is empty; retain Google's last successful snapshot");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>\n<title>Tap Rater products</title><link>${xml(origin)}</link><description>Tap Rater Standard and Branded NFC stands</description>\n${items.join("\n")}\n</channel></rss>`;
}
