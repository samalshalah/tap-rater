import type { MigratedProduct } from "@/data/migrated-products";
import { generateProductVariantSku, getDefaultProductColor, getDefaultPurchasableProductSize, getProductBaseSku } from "@/lib/product-model";
import type { PurchaseOptionId } from "@/lib/purchase-options";

/** Shared by catalog exports, checkout imports and advertising events. */
export function merchantProductId(product: MigratedProduct, purchaseOptionId: PurchaseOptionId) {
  const sku = generateProductVariantSku(product, {
    sizeCode: getDefaultPurchasableProductSize(product)?.code,
    colorCode: getDefaultProductColor(product)?.code,
    purchaseOptionId,
  });
  const discoveredId = `${getProductBaseSku(product)}_${sku.toLowerCase()}`;
  return discoveredId.length <= 50 ? discoveredId : sku;
}
