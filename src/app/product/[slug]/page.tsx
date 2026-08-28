import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { FaqList } from "@/components/storefront/faq-list";
import { ProcessStepCard } from "@/components/storefront/process-step-card";
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
import { absoluteUrl, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { resolveProductSeo } from "@/lib/product-seo";
import { getCanonicalProductSlug } from "@/lib/product-slug-aliases";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
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
      images: product.images.map((image) => ({ url: absoluteUrl(image.src), alt: image.alt }))
    }
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const canonicalSlug = getCanonicalProductSlug(slug);

  if (canonicalSlug !== slug) {
    permanentRedirect(`/product/${canonicalSlug}`);
  }

  const product = await getStorefrontProductBySlug(canonicalSlug);

  if (!product) {
    notFound();
  }

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

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <SectionShell spacing="compact">
        <ProductHero product={product} category={category} destination={destination} fromPrice={fromPrice} />
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container">
          <SectionHeader align="left" eyebrow="Key features" title="Built for tap and scan reviews." />
          <div className="grid gap-4 md:grid-cols-4">
            {highlights.map((highlight, index) => (
              <ProcessStepCard key={highlight.title} description={highlight.body} index={index} title={highlight.title} />
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell spacing="default">
        <div className="tr-container">
          <SectionHeader align="left" eyebrow="How it works" title="From Google link to ready counter stand." />
          <div className="mt-7 grid gap-4 md:grid-cols-5">
            {howItWorks.map((step) => (
              <ProcessStepCard key={step.step} description={step.body} index={step.step - 1} title={step.title} />
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing="default">
        <div className="tr-container">
          <SectionHeader align="left" eyebrow="Compare" title="Standard vs. Branded" />
          <div className="mt-7 overflow-hidden rounded-lg border border-line bg-white">
            <ComparisonRow label="" standard="Standard" branded="Branded" header />
            <ComparisonRow label="NFC Tap" standard="Yes" branded="Yes" />
            <ComparisonRow label="Printed QR" standard="Yes" branded="Yes" />
            <ComparisonRow label="Direct destination" standard="Yes" branded="Yes" />
            <ComparisonRow label="Ready-made design" standard="Yes" branded="-" />
            <ComparisonRow label="Your logo" standard="-" branded="Yes" />
            <ComparisonRow label="Business name" standard="-" branded="Yes" />
            <ComparisonRow label="Front proof" standard="-" branded="Yes" />
            <ComparisonRow label="Monthly subscription" standard="None" branded="None" />
            <ComparisonRow label="Price" standard="$39" branded="$49" />
          </div>
        </div>
      </SectionShell>

      {specifications.length > 0 ? (
        <SectionShell spacing="default">
          <div className="tr-container">
            <SectionHeader align="left" eyebrow="Specifications" title="Physical product details" />
            <dl className="mt-7 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-2">
              {specifications.map((specification) => (
                <div key={specification.label} className="grid grid-cols-[minmax(120px,0.8fr)_1fr] gap-4 border-b border-line px-4 py-3 last:border-b-0 md:last:border-b md:[&:nth-last-child(-n+2)]:border-b-0">
                  <dt className="text-sm font-semibold text-ink">{specification.label}</dt>
                  <dd className="text-sm leading-6 text-muted">{specification.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SectionShell>
      ) : null}

      {includedItems.length > 0 ? (
        <SectionShell tone="soft" spacing="default">
          <div className="tr-container">
            <SectionHeader align="left" eyebrow="What's included" title="Prepared before shipping" />
            <ul className="mt-7 grid gap-3 md:grid-cols-2">
              {includedItems.map((item) => (
                <li key={item.label} className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
                  {item.label}
                  {item.appliesTo === "branded" ? <span className="ml-2 text-xs font-semibold uppercase tracking-[0.05em] text-brand">Branded</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </SectionShell>
      ) : null}

      <SectionShell spacing="default">
        <div className="tr-container">
          <SectionHeader align="left" eyebrow="Product questions" title="Answers before you buy." />
          <FaqList faqs={productFaqs} className="mt-7 grid max-w-4xl gap-3" />
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
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

function ComparisonRow({ label, standard, branded, header = false }: { label: string; standard: string; branded: string; header?: boolean }) {
  const className = header ? "font-black text-ink" : "text-muted";
  return (
    <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] border-b border-line px-4 py-3 text-sm last:border-b-0">
      <div className={header ? "font-black text-ink" : "font-semibold text-ink"}>{label}</div>
      <div className={className}>{standard}</div>
      <div className={className}>{branded}</div>
    </div>
  );
}
