import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { migratedProducts } from "@/data/migrated-products";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductSetupChooser } from "@/components/product/product-setup-chooser";
import { getStorefrontProducts, getStorefrontRelatedProducts } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getProductPageHighlights, getReviewDestination } from "@/lib/product-page-content";
import { absoluteUrl, faqJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { getLowestPurchasePriceCents } from "@/lib/purchase-options";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getStorefrontProducts()).find((item) => item.slug === slug && item.isActive);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const title = product.seoTitle?.replace(" | Tap Rater", "") ?? product.title;
  const description = product.seoDescription ?? product.description;

  return {
    title,
    description,
    keywords: product.searchKeywords,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/product/${product.slug}`,
      images: product.images.map((image) => ({ url: absoluteUrl(image.src), alt: image.alt }))
    }
  };
}

export function generateStaticParams() {
  return migratedProducts.filter((product) => product.isActive).map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const products = await getStorefrontProducts();
  const product = products.find((item) => item.slug === slug && item.isActive);

  if (!product) {
    notFound();
  }

  const category = getCategoryBySlug(product.categorySlug);
  const relatedProducts = getStorefrontRelatedProducts(product, products);
  const highlights = getProductPageHighlights(product);
  const destination = getReviewDestination(product);
  const fromPrice = formatPrice(getLowestPurchasePriceCents(product));
  const productFaqs = [
    {
      question: `How does ${product.title} work?`,
      answer:
        "Customers tap their phone or scan the QR code. The stand opens the direct destination link configured for your business."
    },
    {
      question: "Does this require a monthly fee?",
      answer: "No. Standard Direct, Branded + QR Direct, and Custom Direct stands are one-time physical stand purchases."
    },
    {
      question: "Can I change the link after printing?",
      answer:
        "The stand is produced for the link you approve. If the destination changes after production, replacement or reprogramming may be required."
    }
  ];

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={faqJsonLd(productFaqs)} />

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
          <ProductGallery product={product} />
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <Link href="/shop" className="text-brand">Shop</Link>
              {category ? (
                <>
                  <span className="text-muted">/</span>
                  <Link href={`/category/${category.slug}`} className="text-brand">{category.title}</Link>
                </>
              ) : null}
            </div>

            <div className="mt-6 rounded-md border border-line bg-white p-5 shadow-sm md:p-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-brand">In stock</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-muted">{destination}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-muted">Tabletop stand</span>
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight text-ink md:text-5xl">{product.title}</h1>
              <p className="mt-5 text-lg leading-8 text-muted">{product.shortDescription}</p>
              <div className="mt-6 border-y border-line py-5">
                <p className="text-sm font-bold uppercase text-muted">Price from</p>
                <p className="mt-1 text-4xl font-black text-brand">{fromPrice}</p>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" /> One direct destination link</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" /> NFC and QR ready</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" /> No subscription required</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" /> Proof approval before cart</p>
              </div>
            </div>

            <div className="mt-5">
              <ProductSetupChooser product={product} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 md:grid-cols-4">
          {highlights.map((highlight) => (
            <article key={highlight.title} className="rounded-md border border-line bg-white p-5">
              <PackageCheck className="h-6 w-6 text-brand" />
              <h2 className="mt-4 text-lg font-black text-ink">{highlight.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{highlight.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">Production note</p>
            <h2 className="mt-3 text-3xl font-black text-ink">Simple physical stand order flow.</h2>
          </div>
          <div className="grid gap-3">
            {[
              "Choose the setup option that matches the stand you want.",
              "Enter the final destination link and any required business branding.",
              "Approve the setup details before the configured stand goes to cart.",
              "Tap Rater confirms production artwork before printing and shipping."
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-md border border-line bg-gray-50 p-4">
                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <p className="text-sm leading-6 text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-brand">Product questions</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Answers before you buy.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {productFaqs.map((faq) => (
              <article key={faq.question} className="rounded-md border border-line bg-white p-5">
                <h3 className="font-bold text-ink">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-brand">More stands</p>
                <h2 className="mt-2 text-3xl font-black text-ink">Related Tap Rater stands</h2>
              </div>
              <Link href="/shop" className="text-sm font-bold text-brand">View all stands</Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.slug} product={relatedProduct} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
