import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { VisualCard } from "@/components/storefront/visual-card";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";

export const metadata: Metadata = {
  title: "Tap Rater Solutions by Business Use",
  description:
    "Shop Tap Rater NFC and QR tabletop stands by business use: restaurants, dealerships, healthcare, beauty, hospitality, retail, real estate, events, and more."
};

export default async function SolutionsPage() {
  const businessUses = await getPublicBusinessUses();
  const visibleBusinessUses = businessUses.filter((useCase) => Boolean(useCase.imageUrl || useCase.bannerImageUrl));

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="hero">
        <div className="tr-container grid gap-8 py-12 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:py-16">
          <div className="lg:pr-6">
            <p className="tr-eyebrow">Shop by business use</p>
            <h1 className="tr-page-title mt-4 max-w-4xl">Solutions for every business.</h1>
            <p className="tr-body mt-5 max-w-3xl text-lg sm:text-xl">
              Start with the environment where customers tap or scan, then choose the stand that fits the moment.
            </p>
            <Link href="/shop" className="tr-editorial-link mt-7">
              Shop all stands
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="tr-premium-surface relative aspect-[4/3]">
            <Image
              src={visibleBusinessUses[0]?.bannerImageUrl || visibleBusinessUses[0]?.imageUrl || "/uploads/use-cases/restaurants-cafes.webp"}
              alt={visibleBusinessUses[0]?.title || "Tap Rater business use"}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow={`${visibleBusinessUses.length} business uses`}
            title="Find the right stand by customer moment."
            body="Choose the business context first, then narrow into products built for that counter, desk, room, or checkout experience."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBusinessUses.map((useCase) => (
              <VisualCard
                key={useCase.slug}
                href={`/solutions/${useCase.slug}`}
                title={useCase.title}
                description={useCase.shortDescription || useCase.description}
                image={{
                  src: useCase.bannerImageUrl ?? useCase.imageUrl ?? "/uploads/products/no-photo-available.png",
                  alt: useCase.title
                }}
                imageFit="cover"
                variant="use-case"
                density="compact"
              />
            ))}
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
