import { singleStandPrice } from "@/lib/offers";
import { getShippingSettings } from "@/lib/shipping-settings";
import { getOffersSettings } from "@/lib/offer-settings";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductDetailsTabs } from "@/components/product/product-details-tabs";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getProductBuyingGuide, getProductBuyingFaqs, resolveProductPageSeo } from "@/lib/product-buying-guide";
import { FaqList } from "@/components/storefront/faq-list";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getRelatedStorefrontProductsForProduct, getStorefrontProductBySlug } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import {
  getProductHowItWorks,
  getProductPageHighlights,
  getProductSpecifications,
  getReviewDestination
} from "@/lib/product-page-content";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getCategoryHref } from "@/lib/category-routes";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { getCanonicalProductSlug } from "@/lib/product-slug-aliases";
import { GoogleReviewStandGuideLinks } from "@/components/storefront/google-review-stand-guide-links";
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

  const [offers, shipping, businesses] = await Promise.all([
    getOffersSettings().catch(() => null), getShippingSettings(), getPublicBusinessUses()
  ]);
  const linkedBusinesses = businesses.filter((item) => item.productSlugs.includes(product.slug));
  const relatedProducts = await getRelatedStorefrontProductsForProduct(product, 5, linkedBusinesses.map((item) => item.productSlugs));
  const category = getCategoryBySlug(product.categorySlug);
  // Keep merchant-authored details; the generic feature cards repeat the hero and setup guide.
  const highlights = product.keyFeatures?.length ? getProductPageHighlights(product) : [];
  const howItWorks = getProductHowItWorks(product);
  const specifications = getProductSpecifications(product);
  const destination = getReviewDestination(product);
  const purchaseOptions = getProductPurchaseOptions(product);
  const fromPrice = formatPrice(getLowestPurchasePriceCents(product)).replace(".00", "");
  const productFaqs = product.catalogManaged ? product.productFaqs ?? [] : [...getProductBuyingFaqs(product).filter(({ question }) =>
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
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: absoluteUrl(`/product/${product.slug}`), primaryImageOfPage: absoluteUrl(getProductVisual(product).src) }} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Shop", href: "/shop" },
        ...(category ? [{ name: category.title, href: getCategoryHref(category.slug) }] : []),
        { name: product.title, href: `/product/${product.slug}` }
      ])} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <SectionShell spacing="compact" className="py-6 sm:py-8 lg:py-14">
        <ProductHero shipping={shipping} offers={offers} key={`${product.slug}:${initialOptionId ?? "default"}`} product={product} category={category} destination={destination} fromPrice={fromPrice} initialOptionId={initialOptionId} introduction={buyingGuide?.introduction} />
      </SectionShell>

      {highlights.length > 0 || specifications.length > 0 || !buyingGuide ? <SectionShell tone="soft" spacing="compact">
        <ProductDetailsTabs
          highlights={highlights}
          howItWorks={howItWorks}
          specifications={specifications}
        />
      </SectionShell> : null}

      <SectionShell spacing="compact"><div className="tr-container-narrow">
        <h2 className="tr-section-title">About this stand</h2>
        <p className="tr-body mt-4 whitespace-pre-line">{product.description}</p>
        <nav aria-label="Shop by use and business" className="mt-6 flex flex-wrap gap-4 font-semibold text-brand underline">
          {category && <Link href={getCategoryHref(category.slug)}>{category.title}</Link>}
          {product.additionalUses?.map(slug => getCategoryBySlug(slug)).filter(use => use && use.slug !== category?.slug).map(use => use &&
            <Link key={use.slug} href={getCategoryHref(use.slug)}>{use.title}</Link>)}
          {linkedBusinesses.map((item) =>
            <Link key={item.slug} href={`/solutions/${item.slug}`}>{item.title}</Link>)}
        </nav>
      </div></SectionShell>

      {product.slug === "google-review-stand" ? <SectionShell tone="soft" spacing="compact">
        <div className="tr-container">
          <SectionHeader
            align="left"
            eyebrow="Custom Google review stand"
            title="One branded stand. Two simple ways to open your review link."
            body="Your logo, NFC and a matching QR code are prepared for the same Google review destination you approve during setup."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-line bg-white p-6">
              <h3 className="text-lg font-semibold">Designed for your business</h3>
              <p className="tr-body-sm mt-3">Printed in the USA with your logo and optional business name, then reviewed as custom artwork before payment.</p>
            </article>
            <article className="rounded-xl border border-line bg-white p-6">
              <h3 className="text-lg font-semibold">Tap or scan</h3>
              <p className="tr-body-sm mt-3">NFC tap and the printed QR code open the same Google review link. No Tap Rater app is required.</p>
            </article>
            <article className="rounded-xl border border-line bg-white p-6">
              <h3 className="text-lg font-semibold">Ready for the counter</h3>
              <p className="tr-body-sm mt-3">The passive NFC tag needs no battery, charging, or Wi-Fi. Customers use their own phone to open the review form.</p>
            </article>
          </div>
          <p className="mt-6 text-sm text-muted">Not sure whether NFC or QR is right for your counter? <Link href="/nfc-vs-qr-google-review-stand" className="font-semibold text-brand underline underline-offset-4">Compare NFC and QR code review stands</Link>.</p>
          <GoogleReviewStandGuideLinks />
        </div>
      </SectionShell> : null}

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
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
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
