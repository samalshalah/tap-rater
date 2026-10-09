import { singleStandPrice } from "@/lib/offers";
import { getShippingSettings } from "@/lib/shipping-settings";
import { getOffersSettings } from "@/lib/offer-settings";
import { ProductOffers } from "@/components/product/product-offers";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductDetailsTabs } from "@/components/product/product-details-tabs";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { FaqList } from "@/components/storefront/faq-list";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getRelatedStorefrontProductsForProduct, getStorefrontProductBySlug } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import {
  getProductFaqs,
  getProductHowItWorks,
  getProductIncludedItems,
  getProductPageHighlights,
  getProductSpecifications,
  getReviewDestination
} from "@/lib/product-page-content";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getCategoryHref } from "@/lib/category-routes";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { resolveProductSeo } from "@/lib/product-seo";
import { getCanonicalProductSlug } from "@/lib/product-slug-aliases";
import { defaultSocialImage } from "@/lib/social-metadata";
import { productSupportsMultiLink } from "@/lib/service-addons";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ design?: string | string[] }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "multi-link-stand") {
    permanentRedirect("/multi-link");
  }

  const canonicalSlug = getCanonicalProductSlug(slug);
  const product = await getStorefrontProductBySlug(canonicalSlug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const seo = resolveProductSeo(product);

  return {
    title: seo.title,
    description: seo.description,
    keywords: product.searchKeywords,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/product/${product.slug}`,
      images: product.images.length
        ? product.images.map((image) => ({ url: absoluteUrl(image.src), alt: image.alt }))
        : [defaultSocialImage]
    }
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const design = (await searchParams)?.design;
  const initialOptionId = design === "branded" ? "branded_qr_direct" : design === "standard" ? "standard_direct" : undefined;

  if (slug === "multi-link-stand") {
    permanentRedirect("/multi-link");
  }

  const canonicalSlug = getCanonicalProductSlug(slug);

  if (canonicalSlug !== slug) {
    permanentRedirect(`/product/${canonicalSlug}${initialOptionId ? `?design=${design}` : ""}`);
  }

  const product = await getStorefrontProductBySlug(canonicalSlug);

  if (!product) {
    notFound();
  }

  const [offers, shipping] = await Promise.all([getOffersSettings().catch(() => null), getShippingSettings()]);
  const category = getCategoryBySlug(product.categorySlug);
  const relatedProducts = await getRelatedStorefrontProductsForProduct(product);
  const highlights = getProductPageHighlights(product);
  const howItWorks = getProductHowItWorks(product);
  const specifications = getProductSpecifications(product);
  const includedItems = getProductIncludedItems(product);
  const destination = getReviewDestination(product);
  const purchaseOptions = getProductPurchaseOptions(product);
  const fromPrice = formatPrice(getLowestPurchasePriceCents(product)).replace(".00", "");
  const productFaqs = getProductFaqs(product);
  const standardPrice = formatPrice(singleStandPrice(product.slug, "standard_direct", purchaseOptions.find((option) => option.id === "standard_direct")?.priceCents ?? product.basePriceCents, offers)).replace(".00", "");
  const brandedPrice = formatPrice(singleStandPrice(product.slug, "branded_qr_direct", purchaseOptions.find((option) => option.id === "branded_qr_direct")?.priceCents ?? product.basePriceCents, offers)).replace(".00", "");

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
        <ProductHero offers={offers} key={`${product.slug}:${initialOptionId ?? "default"}`} product={product} category={category} destination={destination} fromPrice={fromPrice} initialOptionId={initialOptionId} />
      {product.checkoutMode === "buy_now" && <ProductOffers settings={offers} productId={product.slug} branded={getProductPurchaseOptions(product).some(o => o.id === "branded_qr_direct")} />}
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <ProductDetailsTabs
          highlights={highlights}
          howItWorks={howItWorks}
          specifications={specifications}
          includedItems={includedItems}
          standardPrice={standardPrice}
          brandedPrice={brandedPrice}
          supportsMultiLink={productSupportsMultiLink(product)}
        />
      </SectionShell>

      <SectionShell spacing="default">
        <div className="tr-container">
          <SectionHeader align="left" eyebrow="Product questions" title="Answers before you buy." />
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
