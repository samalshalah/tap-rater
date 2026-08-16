import type { Metadata } from "next";
import { VisualCard } from "@/components/storefront/visual-card";
import { businessUseCases } from "@/lib/storefront-visuals";

export const metadata: Metadata = {
  title: "Tap Rater Solutions by Business Use",
  description:
    "Shop Tap Rater NFC and QR tabletop stands by business use: restaurants, dealerships, healthcare, beauty, hospitality, retail, real estate, events, and more."
};

export default function SolutionsPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Shop by business use</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-ink md:text-5xl">Choose the use case first.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            These cards are for buyers who think by business type, not product category. Each path points to the closest current stand group.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businessUseCases.map((useCase) => (
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
    </main>
  );
}
