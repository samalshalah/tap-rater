import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { FaqList } from "@/components/storefront/faq-list";
import { ProcessStepCard } from "@/components/storefront/process-step-card";
import { getRelatedStorefrontProductsForProduct, getStorefrontProductBySlug } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getProductPageHighlights, getReviewDestination } from "@/lib/product-page-content";
import { absoluteUrl, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { resolveProductSeo } from "@/lib/product-seo";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const productSlugAliases: Record<string, string> = {
  "view-our-menu-stand": "view-menu-stand",
  "book-your-next-visit-stand": "book-appointment-stand"
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = productSlugAliases[slug] ?? slug;
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

  if (productSlugAliases[slug]) {
    redirect(`/product/${productSlugAliases[slug]}`);
  }

  const product = await getStorefrontProductBySlug(slug);

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
    <main className="bg-white text-ink">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <section className="border-b border-line bg-white">
        <ProductHero product={product} category={category} destination={destination} fromPrice={fromPrice} />
      </section>

      <section className="border-b border-line bg-[#f7f8f8]">
        <div className="tr-container py-12">
          <div className="grid gap-4 md:grid-cols-4">
            {highlights.map((highlight, index) => (
              <ProcessStepCard key={highlight.title} description={highlight.body} index={index} title={highlight.title} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="tr-container tr-section">
          <div className="max-w-3xl">
            <p className="tr-eyebrow">Product questions</p>
            <h2 className="mt-3 text-[2.15rem] font-semibold leading-tight text-ink md:text-[2.85rem]">Answers before you buy.</h2>
          </div>
          <FaqList faqs={productFaqs} className="mt-7 grid max-w-4xl gap-3" />
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="bg-[#f7f8f8]">
          <div className="tr-container tr-section">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="tr-eyebrow">More stands</p>
                <h2 className="mt-3 text-[2.15rem] font-semibold leading-tight text-ink md:text-[2.85rem]">Related Tap Rater stands</h2>
              </div>
              <Link href="/shop" className="text-sm font-semibold text-brand">
                View all stands
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {relatedProducts.slice(0, 5).map((relatedProduct) => (
                <ProductCard key={relatedProduct.slug} product={relatedProduct} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
