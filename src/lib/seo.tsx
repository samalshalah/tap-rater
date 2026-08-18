import type { MigratedProduct } from "@/data/migrated-products";
import { resolveProductSeo } from "@/lib/product-seo";
import { getProductPriceCents } from "@/lib/products";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com";

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export function productJsonLd(product: MigratedProduct) {
  const price = (getProductPriceCents(product) / 100).toFixed(2);
  const seo = resolveProductSeo(product);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: seo.description,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: "Tap Rater"
    },
    image: product.images.map((image) => absoluteUrl(image.src))
  };

  if (product.checkoutMode === "buy_now") {
    data.offers = {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: "USD",
      price,
      availability: product.stockStatus === "instock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition"
    };
  }

  return data;
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
