import type { MigratedProduct } from "@/data/migrated-products";

export type PurchaseOptionId = "standard_direct" | "branded_qr_direct" | "hosted_multi_link" | "custom_direct";

export type PurchaseOption = {
  id: PurchaseOptionId;
  productSlug: string;
  label: string;
  priceCents: number;
  summary: string;
  requiresBusinessName: boolean;
  requiresLogo: boolean;
  requiresCustomText: boolean;
  requiresManualCollection: boolean;
  requiresFinalProof: boolean;
};

function pricingTierToOptionId(tier: MigratedProduct["pricingTier"]): PurchaseOptionId {
  return tier === "custom" ? "custom_direct" : tier;
}

// Derives a purchase option DIRECTLY from a real product -- no hardcoded
// prices. This is the actual fix for the bug where every product page
// showed a static $39 or $49 regardless of which specific product/tier it
// actually was.
export function productToPurchaseOption(product: MigratedProduct): PurchaseOption {
  // A product needs managed/premium setup (not the free/basic tier) exactly
  // when it requires logo collection and a final proof before printing --
  // this already exists as the product's own activationType, set correctly
  // for every product when it was created (see src/data/migrated-products.ts).
  const requiresManagedSetup = product.activationType !== "free_basic_activation";

  // designLogic is the reliable signal here, NOT allowsLogoUpload or
  // customizationOptions -- those are identical across a product's
  // standard and branded tiers (both list "add_logo" as an available
  // customization type for the product LINE), so they can't distinguish
  // "this specific tier requires a logo" from "this product line supports
  // logos at some tier." designLogic was built specifically to carry that
  // distinction.
  const isBrandedOrCustom = product.designLogic !== "standard_platform_locked" && product.designLogic !== "text_action_locked";

  return {
    id: pricingTierToOptionId(product.pricingTier),
    productSlug: product.slug,
    label: product.title,
    priceCents: product.salePriceCents ?? product.basePriceCents,
    summary: product.shortDescription,
    requiresBusinessName: isBrandedOrCustom,
    requiresLogo: isBrandedOrCustom,
    requiresCustomText: product.designLogic === "fully_custom_design",
    requiresManualCollection: requiresManagedSetup,
    requiresFinalProof: requiresManagedSetup
  };
}

// For the in-page "choose your tier" selector: given a product, finds its
// real tier siblings (e.g. Standard Direct <-> Branded + QR Direct, by the
// -branded-qr slug convention the branded-tier generator uses) so the
// selector can offer an actual upsell to a real product with its real
// price, not an abstract hardcoded option.
export function getProductPurchaseOptions(product: MigratedProduct, allProducts: MigratedProduct[]): PurchaseOption[] {
  if (product.designLogic === "fully_custom_design") {
    return [productToPurchaseOption(product)];
  }

  const baseSlug = product.slug.replace(/-branded-qr$/, "");
  const standardProduct = allProducts.find((item) => item.slug === baseSlug && item.pricingTier === "standard_direct" && item.isActive);
  const brandedProduct = allProducts.find(
    (item) => item.slug === `${baseSlug}-branded-qr` && item.pricingTier === "branded_qr_direct" && item.isActive
  );

  const siblingOptions = [standardProduct, brandedProduct].filter((item): item is MigratedProduct => Boolean(item)).map(productToPurchaseOption);

  // Fall back to just this product's own option if no siblings were found
  // (e.g. Hosted Multi-Link Stand, which doesn't have a standard/branded
  // pair) -- never return an empty list.
  return siblingOptions.length > 0 ? siblingOptions : [productToPurchaseOption(product)];
}

export function getPurchaseOptionForProduct(product: MigratedProduct): PurchaseOption {
  return productToPurchaseOption(product);
}

export function getLowestPurchasePriceCents(product: MigratedProduct, allProducts: MigratedProduct[]): number {
  return Math.min(...getProductPurchaseOptions(product, allProducts).map((option) => option.priceCents));
}
