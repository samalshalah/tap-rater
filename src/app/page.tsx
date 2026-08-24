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
      "Custom printed tabletop NFC and QR stands for local businesses. Choose a stand, add your link, and Tap Rater prints and ships.",
    url: "/"
  }
};

const proofPoints = ["Standard Direct from $39", "No subscription required", "QR and NFC use the same customer URL"];

const options = [
  {
    title: "Standard Direct",
    price: "$39",
    body: "QR and NFC pointed directly to one destination link."
  },
  {
    title: "DIRECT mode",
    price: "No account",
    body: "No Tap Rater account, hosted page, activation step, or subscription is required."
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
        <div className="tr-container grid gap-10 py-10 sm:py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-16">
          <div>
            <p className="tr-eyebrow">Tap Rater NFC + QR stands</p>
            <h1 className="tr-hero-title mt-4 max-w-3xl break-words">
              Turn Every Counter Into a Customer Action Point
            </h1>
            <p className="tr-body mt-5 max-w-2xl sm:text-lg">
              Sell NFC stands that help customers review, book, follow, view menus, and visit your links with one tap.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="tr-button-primary px-6">
                Shop Stands
              </Link>
              <Link href="/how-it-works" className="tr-button-outline px-6">
                See How It Works
              </Link>
              <div className="flex basis-full flex-col items-start gap-2 pt-1 text-[13px] font-semibold text-muted sm:flex-row sm:flex-wrap sm:gap-x-4 sm:text-sm">
                {proofPoints.map((item) => (
                  <span key={item} className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="tr-premium-surface relative min-h-[340px] bg-soft lg:min-h-[560px]">
            {heroProductImage ? (
              <Image src={heroProductImage.src} alt={heroProductImage.alt} fill priority unoptimized className="object-contain p-2 sm:p-4 lg:p-5" />
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="tr-container grid gap-6 py-8 md:grid-cols-2">
          {options.map((option) => (
            <article key={option.title} className="border-l-2 border-brand pl-5">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <p className="tr-eyebrow">{option.title}</p>
                  <h2 className="mt-2 text-2xl font-black text-ink">{option.title === "Standard Direct" ? `${option.price} one-time` : option.price}</h2>
                </div>
              </div>
              <p className="tr-body-sm mt-3">{option.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-soft">
        <div className="tr-container tr-section">
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
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {customerActionCards.map((card) => (
              <VisualCard key={card.title} href={card.href} title={card.title} description={card.description} image={card.image} cta="View stand" />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="tr-container tr-section">
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
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {businessUseCases.slice(0, 6).map((useCase) => (
              <VisualCard
                key={useCase.title}
                href={useCase.href}
                title={useCase.title}
                description={useCase.description}
                image={useCase.image}
                imageFit="cover"
                cta="Explore solutions"
                variant="use-case"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-soft">
        <div className="tr-container tr-section">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
                <p className="tr-eyebrow">Popular stands</p>
                <h2 className="tr-section-title mt-3">Ready stands for the launch catalog.</h2>
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
