import Link from "next/link";
import type { Metadata } from "next";
import { useCases } from "@/data/use-cases";
import { getActiveUseCaseSlugs, getProductsByUseCase } from "@/lib/products";

export const metadata: Metadata = {
  title: "Tap Rater Solutions by Business Type",
  description: "Find the right NFC and QR tabletop stands for your business -- restaurants, auto dealers, healthcare, home services, real estate, and more."
};

export default function SolutionsPage() {
  const activeSlugs = getActiveUseCaseSlugs();
  const solutions = useCases.filter((useCase) => activeSlugs.has(useCase.slug));

  return (
    <main className="bg-[#f5f5f7]">
      <section className="mx-auto max-w-7xl px-4 py-14">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Solutions</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-ink">Find the right setup for your business.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Start with your business type. Each solution shows the products businesses like yours actually use.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {solutions.map((useCase) => {
            const productCount = getProductsByUseCase(useCase.slug).length;
            return (
              <Link key={useCase.slug} href={`/use/${useCase.slug}`} className="rounded-md border border-line bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <p className="text-xs font-black uppercase text-brand">{productCount} products</p>
                <h2 className="mt-3 text-xl font-black text-ink">{useCase.name}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{useCase.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
