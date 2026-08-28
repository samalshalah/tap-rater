import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { FaqList } from "@/components/storefront/faq-list";
import { ProcessStepCard } from "@/components/storefront/process-step-card";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getRelatedStorefrontProductsForProduct, getStorefrontProductBySlug } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getProductPageHighlights, getReviewDestination } from "@/lib/product-page-content";
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
  const destination = getReviewDestination(product);
  const purchaseOptions = getProductPurchaseOptions(product);
  const supportsBrandedDirect = purchaseOptions.some((option) => option.id === "branded_qr_direct");
  const fromPrice = formatPrice(getLowestPurchasePriceCents(product)).replace(".00", "");
  const productFaqs = [
    {
      question: `How does ${product.title} work?`,
      answer:
        "Customers tap their phone or scan the QR code. The stand opens the direct destination link configured for your business."
    },
    {
      question: "Does this require a subscription?",
      answer: supportsBrandedDirect
        ? "No. Standard Direct and Branded + QR Direct stands are one-time physical stand purchases."
        : "No. Standard Direct stands are one-time physical stand purchases."
    },
    {
      question: "Can I change the link after ordering?",
      answer:
        "The stand is prepared for the link you approve. If the destination changes after ordering, replacement or reprogramming may be required."
    }
  ];

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <SectionShell spacing="compact">
        <ProductHero product={product} category={category} destination={destination} fromPrice={fromPrice} />
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container">
          <div className="grid gap-4 md:grid-cols-4">
            {highlights.map((highlight, index) => (
              <ProcessStepCard key={highlight.title} description={highlight.body} index={index} title={highlight.title} />
            ))}
          </div>
        </div>
      </SectionShell>

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
