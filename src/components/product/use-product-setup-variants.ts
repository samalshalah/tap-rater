"use client";

import { useMemo } from "react";
import { generateProductVariantSku, getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultPurchasableProductSize } from "@/lib/product-model";
import type { PurchaseOption } from "@/lib/purchase-options";
import type { ProductSetupChooserProduct } from "./product-setup-chooser-types";

export function useProductSetupVariants(product: ProductSetupChooserProduct, selectedOption: PurchaseOption | undefined, selectedSizeCode: string, selectedColorCode: string) {
  const activeSizes = useMemo(() => product.sizeOptions?.filter((size) => size.isActive) ?? [], [product.sizeOptions]);
  const purchasableSizes = useMemo(() => activeSizes.filter((size) => size.priceAdjustmentCents !== null), [activeSizes]);
  const defaultPurchasableSize = useMemo(() => getDefaultPurchasableProductSize(product), [product]);
  const selectedSize = purchasableSizes.find((size) => size.code === selectedSizeCode) ?? defaultPurchasableSize;
  const activeColors = useMemo(() => product.colorOptions?.filter((color) => color.isActive) ?? [], [product.colorOptions]);
  const defaultColor = useMemo(() => getDefaultProductColor(product), [product]);
  const selectedColor = activeColors.find((color) => color.code === selectedColorCode) ?? defaultColor;
  const configuredUnitPriceCents = useMemo(() => selectedOption
    ? getConfiguredUnitPriceCents(product, selectedOption, { sizeCode: selectedSize?.code, colorCode: selectedColor?.code })
    : null, [product, selectedOption, selectedSize?.code, selectedColor?.code]);
  const finalSku = useMemo(() => selectedOption
    ? generateProductVariantSku(product, { purchaseOptionId: selectedOption.id, sizeCode: selectedSize?.code, colorCode: selectedColor?.code })
    : product.sku, [product, selectedOption, selectedSize?.code, selectedColor?.code]);
  return { activeSizes, selectedSize, activeColors, selectedColor, configuredUnitPriceCents, finalSku };
}
