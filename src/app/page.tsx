import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { getPrimaryProductImage } from "@/lib/product-images";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCatalogCategories } from "@/lib/products";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "NFC and QR Stands for Reviews, Menus, Booking, Social Media and More",
  description:
    "Custom printed tabletop NFC and QR stands that let customers tap or scan to open your review, menu, booking, social media, feedback, or custom link instantly.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NFC and QR Stands for Reviews, Menus, Booking, Social Media and More | Tap Rater",
    description:
      "Custom printed tabletop NFC and QR stands for local businesses. Choose a stand, add your link or branding, approve your design, and Tap Rater prints and ships.",
    url: "/"
  }
};

const featuredProductSlugs = [
  "google-review-stand",
  "view-our-menu-stand",
  "book-your-next-visit-stand",
  "custom-direct-stand"
];

const steps = [
  "Choose your stand",
  "Add your link or branding",
  "Approve your design",
  "We print and ship"
];

export default async function HomePage() {
  const products = await getStorefrontProducts();
  const categories = getCatalogCategories();
  const featuredProducts = featuredProductSlugs.flatMap((slug) => {
    const product = products.find((item) => item.slug === slug);
    return product ? [product] : [];
  });
  const heroProduct = products.find((product) => product.slug === "google-review-stand") ?? products[0];
  const heroProductImage = heroProduct ? getPrimaryProductImage(heroProduct) : undefined;

  return (
    <main className="bg-white text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <section className="overflow-hidden bg-[#f5f5f7]">
        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Custom printed tap and scan stands</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.02] tracking-normal text-ink sm:text-6xl lg:text-7xl">
              NFC & QR Stands for Reviews, Menus, Booking, Social Media and More
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Custom printed tabletop stands that let customers tap or scan to open your link instantly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="inline-flex items-center justify-center rounded-md bg-ink px-6 py-4 text-sm font-black text-white transition hover:bg-brand">
                Shop Stands
              </Link>
              <Link href="/custom-stands" className="inline-flex items-center justify-center rounded-md border border-line bg-white px-6 py-4 text-sm font-black text-ink transition hover:border-ink">
                Create Custom Stand
              </Link>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-3">
              {["From $39", "No subscription required", "Proof before production"].map((item) => (
                <p key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="relative min-h-[500px]">
            <div className="absolute inset-x-12 bottom-8 h-12 rounded-full bg-gray-300/80 blur-2xl" />
            {heroProductImage ? (
              <Image src={heroProductImage.src} alt={heroProductImage.alt} fill priority className="object-contain" />
            ) : null}
            <div className="absolute right-0 top-8 rounded-md border border-line bg-white p-5 shadow-xl">
              <p className="text-xs font-black uppercase text-muted">Starting at</p>
              <p className="mt-1 text-4xl font-black text-ink">$39</p>
              <p className="mt-2 max-w-[220px] text-sm leading-6 text-muted">Ready-made direct NFC stand. Branded + QR from $49.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step} className="rounded-md border border-line bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-black text-white">{index + 1}</span>
                <h2 className="mt-5 text-lg font-black text-ink">{step}</h2>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f7]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Shop by use</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink md:text-5xl">Find the stand your customer will understand.</h2>
            </div>
            <Link href="/solutions" className="inline-flex items-center gap-2 text-sm font-black text-brand">
              View all solutions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link key={category.slug} href={`/category/${category.slug}`} className="rounded-md border border-line bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <p className="text-xs font-black uppercase text-brand">{category.eyebrow}</p>
                <h3 className="mt-3 text-xl font-black text-ink">{category.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{category.buyerIntent}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Featured stands</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-ink md:text-5xl">Popular ways to start selling more customer actions.</h2>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-black text-brand">
              Shop all stands
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
