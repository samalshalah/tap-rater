import type { MigratedProduct } from "@/data/migrated-products";

export type ServiceAddonCode = "hosted_multilink";

export type ServiceAddon = {
  code: ServiceAddonCode;
  title: string;
  monthlyPriceCents: number;
  requiresAccount: boolean;
  requiresHostedPage: boolean;
  maxLinks: number;
  active: boolean;
};

export const hostedMultiLinkServiceAddon: ServiceAddon = {
  code: "hosted_multilink",
  title: "Multi-Link",
  monthlyPriceCents: 999,
  requiresAccount: true,
  requiresHostedPage: true,
  maxLinks: 10,
  active: true
};

export const serviceAddons = [hostedMultiLinkServiceAddon];

export function productSupportsMultiLink(product: Pick<MigratedProduct, "supportsMultiLink" | "productKind" | "requiresLandingPage" | "requiresSubscription">) {
  return product.supportsMultiLink === true && product.productKind !== "hosted_multilink" && !product.requiresLandingPage && !product.requiresSubscription;
}
