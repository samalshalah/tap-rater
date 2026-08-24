import type { Metadata } from "next";
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
    <main className="bg-white text-ink">
      <section className="bg-white">
        <div className="tr-container py-12 lg:py-16">
          <p className="tr-eyebrow">Shop by business use</p>
          <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.25rem]">Solutions for every business.</h1>
          <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-[#5f686f]">
            Start with the environment where customers tap or scan, then choose the stand that fits the moment.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8f8]">
        <div className="tr-container py-12 lg:py-16">
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
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
