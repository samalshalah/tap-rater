import type {MigratedProduct,ProductPurchaseOptionSnapshot} from '@/data/migrated-products';
import {correctKnownPurchaseCopy} from '@/lib/purchase-options';
import { brandedProductTitle } from '@/lib/branded-product-title';
import { brandedProductDescription } from '@/lib/branded-product-description';

export function sanitizePublicStorefrontProduct(product: MigratedProduct): MigratedProduct {
  if (isHostedProduct(product)) {
    return product;
  }

  const copy = brandedProductDescription(product);
  return {
    ...product,
    title: brandedProductTitle(product.title),
    seoTitle: product.seoTitle ? brandedProductTitle(product.seoTitle) : product.seoTitle,
    ...copy,
    requiresAccount: false,
    requiresSubscription: false,
    requiresLandingPage: false,
    serviceMode: product.serviceMode === "hosted_landing_page" ? "basic_redirect" : product.serviceMode,
    activationType: product.activationType === "premium_hosted_activation" ? "free_basic_activation" : product.activationType
  };
}

export function sanitizeRetiredPublicCopy(value: string) {
  return value
    .replace(/\bNo monthly fee required for basic activation\.?/gi, "One-time physical product purchase.")
    .replace(/\bdoes not require a monthly fee for basic activation\.?/gi, "connects as a one-time physical product purchase.")
    .replace(/\bwith no monthly fee\.?/gi, "as a one-time physical product purchase.")
    .replace(/\bNo monthly fee\.?/gi, "One-time physical product purchase.")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePublicStorefrontOption(option: ProductPurchaseOptionSnapshot): ProductPurchaseOptionSnapshot {
  if (option.optionCode !== "standard_direct") {
    return { ...option, description: correctKnownPurchaseCopy(option.description) };
  }

  return {
    ...option,
    description: correctKnownPurchaseCopy(option.description),
    requiresDestinationUrl: true,
    hasQr: false,
    requiresLogo: false,
    requiresBusinessName: false,
    requiresDesignStep: false,
    requiresFrontProof: false,
    requiresSubscription: false,
    accountRequired: false,
    footerLabel: !option.footerLabel || ["NFC only", "QR + NFC", "QR + NFC direct", "QR and NFC direct"].includes(option.footerLabel)
      ? "NFC direct"
      : option.footerLabel
  };
}

export function containsLegacyDirectCopy(value: string | undefined) {
  return Boolean(value && /(mvp\s+media|mvp\s+catalog)/i.test(value));
}

export function isHostedProduct(product: MigratedProduct) {
  return product.productKind === "hosted_multilink" || product.requiresLandingPage || product.requiresSubscription || product.serviceMode === "hosted_landing_page";
}
