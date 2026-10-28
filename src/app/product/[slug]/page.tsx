import { singleStandPrice } from "@/lib/offers";
import { getShippingSettings } from "@/lib/shipping-settings";
import { getOffersSettings } from "@/lib/offer-settings";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductDetailsTabs } from "@/components/product/product-details-tabs";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { ProductBuyingGuide } from "@/components/product/product-buying-guide";
import { getProductBuyingGuide, getProductBuyingFaqs, resolveProductPageSeo } from "@/lib/product-buying-guide";
import { FaqList } from "@/components/storefront/faq-list";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getRelatedStorefrontProductsForProduct, getStorefrontProductBySlug } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import {
  getProductHowItWorks,
  getProductIncludedItems,
  getProductPageHighlights,
  getProductSpecifications,
  getReviewDestination
} from "@/lib/product-page-content";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getCategoryHref } from "@/lib/category-routes";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { getCanonicalProductSlug } from "@/lib/product-slug-aliases";
import { defaultSocialImage } from "@/lib/social-metadata";
import { productSupportsMultiLink } from "@/lib/service-addons";
import { getProductVisual } from "@/lib/storefront-visuals";
import { nfcProductFaqs } from "@/lib/branded-product-description";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "multi-link-stand") {
    permanentRedirect("/multi-link");
  }

  const canonicalSlug = getCanonicalProductSlug(slug);
  const product = await getStorefrontProductBySlug(canonicalSlug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const seo = resolveProductPageSeo(product);
  const selectedImage = getProductVisual(product);
  const images = selectedImage
    ? [{ url: absoluteUrl(selectedImage.src), alt: selectedImage.alt || product.title }]
    : [defaultSocialImage];

  return {
    title: seo.title,
    description: seo.description,
    keywords: product.searchKeywords,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/product/${product.slug}`,
      images
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images
    }
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const design = Array.isArray(query?.design) ? query.design[0] : query?.design;
  const initialOptionId = "branded_qr_direct";

  if (slug === "multi-link-stand") {
    permanentRedirect("/multi-link");
  }

  const canonicalSlug = getCanonicalProductSlug(slug);

  if (canonicalSlug !== slug || design === "standard") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
    }
    if (design === "standard") params.set("design", "branded");
    permanentRedirect(`/product/${canonicalSlug}${params.size ? `?${params}` : ""}`);
  }

  const product = await getStorefrontProductBySlug(canonicalSlug);

  if (!product) {
    notFound();
  }

  const [offers, shipping, relatedProducts] = await Promise.all([
    getOffersSettings().catch(() => null), getShippingSettings(), getRelatedStorefrontProductsForProduct(product)
  ]);
  const category = getCategoryBySlug(product.categorySlug);
  // Keep merchant-authored details; the generic feature cards repeat the hero and setup guide.
  const highlights = product.keyFeatures?.length ? getProductPageHighlights(product) : [];
  const howItWorks = getProductHowItWorks(product);
  const specifications = getProductSpecifications(product);
  const includedItems = getProductIncludedItems(product);
  const destination = getReviewDestination(product);
  const purchaseOptions = getProductPurchaseOptions(product);
  const fromPrice = formatPrice(getLowestPurchasePriceCents(product)).replace(".00", "");
  const productFaqs = [...getProductBuyingFaqs(product).filter(({ question }) =>
    !question.startsWith("How does ") &&
    !/\bstandard\b/i.test(question) &&
    question !== "Do customers need a special app to tap the stand?" &&
    question !== "Does this require a subscription?" &&
    question !== "Which design includes a printed QR code?"
  ), ...nfcProductFaqs];
  const buyingGuide = getProductBuyingGuide(product);

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={productJsonLd(product, { offers, shipping })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Shop", href: "/shop" },
        ...(category ? [{ name: category.title, href: getCategoryHref(category.slug) }] : []),
        { name: product.title, href: `/product/${product.slug}` }
      ])} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <SectionShell spacing="compact" className="py-6 sm:py-8 lg:py-14">
        <ProductHero shipping={shipping} offers={offers} key={`${product.slug}:${initialOptionId ?? "default"}`} product={product} category={category} destination={destination} fromPrice={fromPrice} initialOptionId={initialOptionId} introduction={buyingGuide?.introduction} />
      </SectionShell>

      {highlights.length > 0 || specifications.length > 0 || includedItems.length > 0 || !buyingGuide ? <SectionShell tone="soft" spacing="compact">
        <ProductDetailsTabs
          highlights={highlights}
          howItWorks={howItWorks}
          specifications={specifications}
          includedItems={includedItems}
        />
      </SectionShell> : null}

      {buyingGuide ? <ProductBuyingGuide title={product.title} slug={product.slug} guide={buyingGuide} /> : null}

      <SectionShell spacing="default">
        <div className="tr-container">
          <SectionHeader align="left" title="Questions & answers" />
          <FaqList faqs={productFaqs} className="mt-7 grid max-w-4xl gap-3" />
          {product.slug === "google-review-stand" ? <Link href="/review-links-generator" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">Find your Google review link</Link> : null}
        </div>
      </SectionShell>

      {relatedProducts.length > 0 ? (
        <SectionShell tone="soft" spacing="default">
          <div className="tr-container">
            <SectionHeader
              eyebrow="More stands"
              title="Related Tap Rater stands"
              cta={{ href: "/shop", label: "View all stands" }}
            />
            <div className="tr-product-grid mt-8">
              {relatedProducts.slice(0, 5).map((relatedProduct) => (
                <ProductCard key={relatedProduct.slug} product={relatedProduct} />
              ))}
            </div>
          </div>
        </SectionShell>
      ) : null}
    </main>
  );
}
