import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { VisualCard } from "@/components/storefront/visual-card";
import { getStorefrontProducts } from "@/lib/product-repository";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { businessUseCases, customerActionCards, productImageFallback } from "@/lib/storefront-visuals";

export const metadata: Metadata = {
  title: "NFC & QR Stands for Reviews, Menus, Booking, Social Media and More",
  description:
    "Custom printed tabletop NFC and QR stands that let customers tap or scan to open your review, menu, booking, social media, feedback, or custom link instantly.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NFC & QR Stands for Reviews, Menus, Booking, Social Media and More | Tap Rater",
    description:
      "Custom printed tabletop NFC and QR stands for local businesses. Choose a stand, add your link or branding, approve your design, and Tap Rater prints and ships.",
    url: "/"
  }
};

const featuredProductSlugGroups = [
  ["google-review-stand", "google-review-stand-branded-qr"],
  ["view-menu-stand", "view-our-menu-stand"],
  ["book-appointment-stand", "book-your-next-visit-stand"],
  ["custom-direct-stand"]
];

const proofPoints = ["From $39", "No subscription required", "Branded proof before cart"];

export default async function HomePage() {
  const products = await getStorefrontProducts();
  const featuredProducts = featuredProductSlugGroups.flatMap((group) => {
    const product = group.map((slug) => products.find((item) => item.slug === slug)).find(Boolean);
    return product ? [product] : [];
  });
  const heroProduct = products.find((product) => product.slug === "google-review-stand") ?? products[0];
  const heroProductImage = heroProduct?.images[0] ?? (heroProduct ? { ...productImageFallback, alt: heroProduct.title } : undefined);

  return (
    <main className="bg-white text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Tap Rater NFC + QR stands</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-normal text-ink sm:text-5xl">
              Choose your business. Find the right stand.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Tabletop stands that make reviews, menus, booking, service, ordering, inventory, websites, and custom actions easy to open with one tap or scan.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-black text-white transition hover:bg-brand">
                Shop Stands
              </Link>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-muted">
                {proofPoints.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[300px] overflow-hidden rounded-[24px] border border-line bg-white lg:min-h-[430px]">
            {heroProductImage ? (
              <Image src={heroProductImage.src} alt={heroProductImage.alt} fill priority unoptimized className="object-contain p-6 sm:p-8" />
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">What do you want customers to do?</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink md:text-4xl">Start with the customer action.</h2>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-black text-brand">
              View every stand
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customerActionCards.map((card) => (
              <VisualCard key={card.title} href={card.href} title={card.title} description={card.description} image={card.image} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Shop by business use</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink md:text-4xl">Use cards that match real buyers.</h2>
            </div>
            <Link href="/solutions" className="inline-flex items-center gap-2 text-sm font-black text-brand">
              View all uses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businessUseCases.slice(0, 6).map((useCase) => (
              <VisualCard
                key={useCase.title}
                href={useCase.href}
                title={useCase.title}
                description={useCase.description}
                image={useCase.image}
                imageFit="cover"
                cta="View recommendations"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Popular stands</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink md:text-4xl">Fast choices for most counters.</h2>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-black text-brand">
              Shop all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => <ProductCard key={product.slug} product={product} />)
            ) : (
              <div className="rounded-[18px] border border-line bg-white p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-4">
                Products are being prepared.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
