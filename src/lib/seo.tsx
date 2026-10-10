import { singleStandPrice, offerShippingSettings, type OffersSettings } from "@/lib/offers";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import type { ShippingSettingsInput } from "@/lib/shipping-settings";
import type { MigratedProduct } from "@/data/migrated-products";
import { generateProductVariantSku, getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultPurchasableProductSize, getProductBaseSku } from "@/lib/product-model";
import { resolveProductSeo } from "@/lib/product-seo";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = getPublicSiteUrl();

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export function productJsonLd(product: MigratedProduct, context?: { offers?: OffersSettings | null; shipping?: ShippingSettingsInput }) {
  const seo = resolveProductSeo(product);
  const url = absoluteUrl(`/product/${product.slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url,
    description: seo.description,
    sku: getProductBaseSku(product),
    brand: {
      "@type": "Brand",
      name: "Tap Rater"
    },
    image: product.images.map((image) => absoluteUrl(image.src))
  };

  if (product.checkoutMode !== "buy_now") return data;

  const size = getDefaultPurchasableProductSize(product);
  const color = getDefaultProductColor(product);
  const selection = { sizeCode: size?.code, colorCode: color?.code };
  const variants = getProductPurchaseOptions(product).flatMap((option) => {
    const price = getConfiguredUnitPriceCents(product, option, selection);
    if (price === null || !Number.isFinite(price) || price < 0 || option.requiresSubscription) return [];
    const effectivePrice = singleStandPrice(product.slug, option.id, price, context?.offers);
    const shippingDetails = context?.shipping && context.shipping.shippingMode !== "manual"
      ? context.shipping.allowedCountryCodes.map((country) => ({
          "@type": "OfferShippingDetails",
          shippingDestination: { "@type": "DefinedRegion", addressCountry: country },
          shippingRate: { "@type": "MonetaryAmount", currency: "USD", value: (resolveCheckoutShippingRule(effectivePrice, context.offers ? offerShippingSettings(context.shipping!, context.offers, country) : { ...context.shipping!, freeShippingThresholdCents: null }).amountCents / 100).toFixed(2) }
        })) : undefined;
    const branded = option.id === "branded_qr_direct";
    const variantUrl = `${url}?design=${branded ? "branded" : "standard"}`;
    const image = (branded ? product.assetSet?.brandedAngledImageUrl : undefined) ?? getProductVisual(product).src;
    return [{
      "@type": "Product",
      "@id": `${url}#${option.id}`,
      name: `${product.title} - ${option.label}`,
      description: option.summary,
      sku: generateProductVariantSku(product, { ...selection, purchaseOptionId: option.id }),
      url: variantUrl,
      image: image ? [absoluteUrl(image)] : product.images.map((item) => absoluteUrl(item.src)),
      brand: data.brand,
      additionalProperty: [{ "@type": "PropertyValue", name: "Design", value: branded ? "Branded + QR" : "Standard NFC-only" }],
      offers: {
        "@type": "Offer",
        url: variantUrl,
        priceCurrency: "USD",
        price: (effectivePrice / 100).toFixed(2),
        ...(shippingDetails?.length ? { shippingDetails } : {}),
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: context?.shipping?.allowedCountryCodes ?? ["US"],
          merchantReturnLink: absoluteUrl("/refund-policy"),
          returnPolicyCategory: branded
            ? "https://schema.org/MerchantReturnNotPermitted"
            : "https://schema.org/MerchantReturnFiniteReturnWindow",
          ...(!branded ? {
            merchantReturnDays: 30,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/ReturnFeesCustomerResponsibility"
          } : {})
        },
        availability: product.isActive && product.stockStatus === "instock" && product.status !== "draft" && product.status !== "archived"
          ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition"
      }
    }];
  });
  if (variants.length === 0) return data;
  if (variants.length === 1) return { "@context": "https://schema.org", ...variants[0] };

  // Customization is not a size/color variant; do not invent a Google variesBy property.
  const { sku: _sku, ...group } = data;
  return { ...group, "@type": "ProductGroup", "@id": `${url}#product-group`, productGroupID: getProductBaseSku(product), hasVariant: variants };
}

export function breadcrumbJsonLd(items: Array<{ name: string; href: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.href)
    }))
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tap Rater",
    url: siteUrl,
    logo: absoluteUrl("/uploads/brand/tap-rater-logo.png"),
    sameAs: []
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tap Rater",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c")
      }}
    />
  );
}
