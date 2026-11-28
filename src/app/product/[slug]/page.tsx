import { isMultiLinkIndustry } from "@/lib/multilink-industries";
import { singleStandPrice } from "@/lib/offers";
import { getShippingSettings } from "@/lib/shipping-settings";
import { getOffersSettings } from "@/lib/offer-settings";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductDetailsTabs } from "@/components/product/product-details-tabs";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { GoogleReviewStandCustomerReviews, GoogleReviewStandValue } from "@/components/product/google-review-stand-value";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getProductBuyingGuide, getProductBuyingFaqs, resolveProductPageSeo } from "@/lib/product-buying-guide";
import { FaqList } from "@/components/storefront/faq-list";
import { BusinessShowcase, type BusinessScene } from "@/components/storefront/business-showcase";
import { PhoneCollapse } from "@/components/product/phone-collapse";
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
import { getPublicProductReviews } from "@/lib/product-reviews";

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
  const addon = Array.isArray(query?.addon) ? query.addon[0] : query?.addon;
  const initialLinkExperience = addon === "multilink" ? "multilink" as const : "direct" as const;
  // Coming from a business page: Multi-Link setup starts with that business's links.
  const businessParam = Array.isArray(query?.business) ? query.business[0] : query?.business;
  const initialBusiness = isMultiLinkIndustry(businessParam) ? businessParam : undefined;

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
  const businessScenes: BusinessScene[] = linkedBusinesses.flatMap((item) => {
    const src = item.bannerImageUrl || item.imageUrl;
    return src ? [{ slug: item.slug, title: item.title, body: "", image: { src, alt: `Tap Rater stand in ${item.title.toLowerCase()}` } }] : [];
  });
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
  const customerReviews = await getPublicProductReviews(product.slug);

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={productJsonLd(product, { offers, shipping, reviews: customerReviews })} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: absoluteUrl(`/product/${product.slug}`), primaryImageOfPage: absoluteUrl(getProductVisual(product).src) }} />
      <JsonLd data={breadcrumbJsonLd([
        { name: "Shop", href: "/shop" },
        ...(category ? [{ name: category.title, href: getCategoryHref(category.slug) }] : []),
        { name: product.title, href: `/product/${product.slug}` }
      ])} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <SectionShell id="stand-setup" spacing="compact" className="scroll-mt-24 py-6 sm:py-8 lg:py-14">
        <ProductHero shipping={shipping} offers={offers} key={`${product.slug}:${initialOptionId ?? "default"}:${initialLinkExperience}:${initialBusiness ?? ""}`} initialLinkExperience={initialLinkExperience} initialBusiness={initialBusiness} product={product} category={category} destination={destination} fromPrice={fromPrice} initialOptionId={initialOptionId} introduction={buyingGuide?.introduction} />
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
        <PhoneCollapse label="Read more about this stand">
          <p className="tr-body mt-4 whitespace-pre-line">{product.description}</p>
        </PhoneCollapse>
        {product.slug === "google-review-stand" ? <>
          <p className="mt-6 text-sm text-muted">Not sure whether NFC or QR is right for your counter? <Link href="/nfc-vs-qr-google-review-stand" className="font-semibold text-brand underline underline-offset-4">Compare NFC and QR code review stands</Link>.</p>
          <GoogleReviewStandGuideLinks />
        </> : null}
      </div></SectionShell>

      {businessScenes.length ? <SectionShell tone="soft" spacing="compact">
        <div className="tr-container">
          <SectionHeader align="left" eyebrow="Shop by business" title="Made for your business" cta={{ href: "/business", label: "All businesses" }} />
          <div className="mt-6"><BusinessShowcase scenes={businessScenes} compact /></div>
        </div>
      </SectionShell> : null}

      {product.slug === "google-review-stand" ? <>
        <GoogleReviewStandValue price={fromPrice} />
          <GoogleReviewStandCustomerReviews data={customerReviews} />
      </> : null}

      <SectionShell spacing="default">
        <div className="tr-container">
          <SectionHeader align="left" title="Questions & answers" />
          <FaqList faqs={productFaqs} className="mt-7 grid max-w-4xl gap-3" />
          {product.slug === "google-review-stand" ? <p className="tr-body-sm mt-5">During stand setup, search for your business by name and city or paste your existing Google review link.</p> : null}
          {product.slug === "instagram-follow-stand" ? <p className="tr-body-sm mt-5">Need help with the destination? <Link href="/guides/instagram-qr-code-for-business" className="font-semibold text-brand underline underline-offset-4">Find your Instagram QR code and set up your follow invitation</Link>.</p> : null}
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
