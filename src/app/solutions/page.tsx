import type { Metadata } from "next";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { VisualCard } from "@/components/storefront/visual-card";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop NFC Stands by Business",
  description:
    "Shop Tap Rater NFC and QR tabletop stands by business use: restaurants, dealerships, healthcare, beauty, hospitality, retail, real estate, events, and more.",
  alternates: { canonical: "/solutions" }
};

export default async function SolutionsPage() {
  const businessUses = await getPublicBusinessUses();
  const visibleBusinessUses = businessUses;

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Shop by business"
        title="Your business. Their next step."
        body="From restaurant tables to reception desks, find a stand that helps customers reach your reviews, menus, booking pages, and more. Choose your business to get started."
        cta={{ href: "#businesses", label: "Find your business" }}
        image={{
          src: visibleBusinessUses[0]?.bannerImageUrl || visibleBusinessUses[0]?.imageUrl || "/uploads/use-cases/restaurants-cafes.webp",
          alt: visibleBusinessUses[0]?.title || "Tap Rater business use",
          fit: "cover"
        }}
      />

      <SectionShell tone="soft">
        <div className="tr-container scroll-mt-28" id="businesses">
          <SectionHeader
            eyebrow="Shop by business"
            title="Where will your stand go?"
            body="Explore products for your setting, then choose the destination and design that work for you."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="mt-10 flex flex-col justify-between gap-4 rounded-xl border border-line bg-white p-6 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold">Don’t see your business?</h2><p className="mt-2 text-sm text-muted">Choose by what customers should do: review, follow, book, or open a link.</p></div><Link href="/shop" className="tr-editorial-link shrink-0">Shop all stands →</Link></div>
        </div>
      </SectionShell>
    </main>
  );
}
