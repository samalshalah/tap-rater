import type { MigratedProduct } from "@/data/migrated-products";
import { merchantProductId } from "@/lib/merchant-product-id";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultPurchasableProductSize } from "@/lib/product-model";
import { isPublicLaunchStorefrontProduct } from "@/lib/product-repository";
import { quoteOffers, type OffersSettings } from "@/lib/offers";

export function metaCatalog(products: MigratedProduct[]) {
  return products.filter(isPublicLaunchStorefrontProduct).flatMap(product => {
    const selection = { sizeCode: getDefaultPurchasableProductSize(product)?.code, colorCode: getDefaultProductColor(product)?.code };
    return getProductPurchaseOptions(product).flatMap(option => {
      const price = getConfiguredUnitPriceCents(product, option, selection);
      return !option.requiresSubscription && price !== null && Number.isFinite(price) && price > 0
        ? [{ id: merchantProductId(product, option.id), product, optionId: option.id, unitAmountCents: price }]
        : [];
    });
  });
}

/** Quote the entire incoming selection, including offers spanning different designs. */
export function quoteMetaCheckout(entries: ReturnType<typeof parseMetaCheckout>, offers: OffersSettings, now = Date.now()) {
  return quoteOffers(entries.map(entry => ({
    productId: entry.product.slug,
    optionId: entry.optionId,
    quantity: entry.quantity,
    unitAmountCents: entry.unitAmountCents,
  })), offers, now);
}

export function parseMetaCheckout(raw: unknown, products: MigratedProduct[]) {
  if (typeof raw !== "string" || !raw || raw.length > 6000) throw new Error("Your shopping link is empty or invalid. Please return to the shop and select your stands again.");
  const parts = raw.split(",");
  if (parts.length > 50) throw new Error("Please contact support for orders with more than 50 different stands.");
  const catalog = new Map(metaCatalog(products).map(item => [item.id, item]));
  const counts = new Map<string, number>();
  for (const part of parts) {
    const match = /^([A-Za-z0-9_-]{1,50}):([1-9][0-9]?)$/.exec(part);
    if (!match || !catalog.has(match[1])) throw new Error("A stand in this shopping link is unavailable. Please return to the shop to choose it again.");
    const quantity = (counts.get(match[1]) ?? 0) + Number(match[2]);
    if (quantity > 99) throw new Error("Please contact support for quantities above 99 of the same stand.");
    counts.set(match[1], quantity);
  }
  return [...counts].map(([id, quantity]) => ({ ...catalog.get(id)!, quantity }));
}
