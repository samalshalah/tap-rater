import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { getRelatedStorefrontProductsForProduct, getStorefrontProductBySlug } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getProductPageHighlights, getReviewDestination } from "@/lib/product-page-content";
import { absoluteUrl, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getLowestPurchasePriceCents } from "@/lib/purchase-options";
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
  const fromPrice = formatPrice(getLowestPurchasePriceCents(product)).replace(".00", "");
  const productFaqs = [
    {
      question: `How does ${product.title} work?`,
      answer:
        "Customers tap their phone or scan the QR code. The stand opens the direct destination link configured for your business."
    },
    {
      question: "Does this require a monthly fee?",
      answer: "No. Standard Direct and Branded + QR Direct stands are one-time physical stand purchases."
    },
    {
      question: "Can I change the link after printing?",
      answer:
        "The stand is produced for the link you approve. If the destination changes after production, replacement or reprogramming may be required."
    }
  ];

  return (
    <main className="bg-[#f7f8fa] text-ink">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <section className="border-b border-line bg-white">
        <ProductHero product={product} category={category} destination={destination} fromPrice={fromPrice} />
      </section>

      <section className="border-b border-line bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {highlights.map((highlight) => (
              <article key={highlight.title} className="rounded-[18px] border border-line bg-white p-5">
                <h2 className="text-base font-black text-ink">{highlight.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{highlight.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Product questions</p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink">Answers before you buy.</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {productFaqs.map((faq) => (
              <article key={faq.question} className="rounded-[18px] border border-line bg-white p-5">
                <h3 className="font-black text-ink">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="bg-[#f7f8fa]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">More stands</p>
                <h2 className="mt-3 text-3xl font-extrabold text-ink">Related Tap Rater stands</h2>
              </div>
              <Link href="/shop" className="text-sm font-black text-brand">
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
