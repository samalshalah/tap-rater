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

export function productJsonLd(product: MigratedProduct) {
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
        price: (price / 100).toFixed(2),
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
