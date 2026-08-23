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

const proofPoints = ["Standard Direct from $39", "No subscription required for direct stands", "Branded proof before cart"];

const options = [
  {
    title: "Standard Direct",
    price: "$39",
    body: "QR and NFC pointed directly to one destination link."
  },
  {
    title: "Branded + QR",
    price: "$49",
    body: "NFC + printed QR with logo upload, business name, and proof preview before cart."
  }
];

export default async function HomePage() {
  const products = await getStorefrontProducts();
  const heroProduct = products.find((product) => product.slug === "google-review-stand") ?? products[0];
  const heroProductImage = heroProduct?.images[0] ?? (heroProduct ? { ...productImageFallback, alt: heroProduct.title } : undefined);

  return (
    <main className="bg-white text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <section className="border-b border-line bg-white">
        <div className="tr-container grid gap-8 py-10 lg:grid-cols-[1fr_0.78fr] lg:items-center lg:py-14">
          <div>
            <p className="tr-eyebrow">Tap Rater NFC + QR stands</p>
            <h1 className="tr-page-title mt-4 max-w-3xl break-words tracking-normal">
              Turn Every Counter Into a Customer Action Point
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Sell NFC stands that help customers review, book, follow, view menus, and visit your links with one tap.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="tr-button-primary px-6">
                Shop Stands
              </Link>
              <Link href="/how-it-works" className="tr-button-outline px-6">
                See How It Works
              </Link>
              <div className="basis-full pt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-muted">
                {proofPoints.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[300px] overflow-hidden rounded-lg border border-line bg-white lg:min-h-[430px]">
            {heroProductImage ? (
              <Image src={heroProductImage.src} alt={heroProductImage.alt} fill priority unoptimized className="object-contain p-6 sm:p-8" />
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="tr-container grid gap-4 py-10 md:grid-cols-2">
          {options.map((option) => (
            <article key={option.title} className="tr-panel-muted p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="tr-eyebrow">{option.title}</p>
                  <h2 className="mt-2 text-2xl font-black text-ink">{option.price} one-time</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted">Direct stand</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{option.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-soft">
        <div className="tr-container py-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="tr-eyebrow">What do you want customers to do?</p>
              <h2 className="tr-section-title mt-3">Start with the customer action.</h2>
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
        <div className="tr-container py-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="tr-eyebrow">Shop by business use</p>
              <h2 className="tr-section-title mt-3">Use cards that match real buyers.</h2>
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

      <section className="border-t border-line bg-soft">
        <div className="tr-container py-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
                <p className="tr-eyebrow">Popular stands</p>
                <h2 className="tr-section-title mt-3">Ready stands for the MVP catalog.</h2>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-black text-brand">
              Shop all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.length > 0 ? (
              products.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)
            ) : (
              <div className="tr-card p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-4">
                Products are being prepared.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
