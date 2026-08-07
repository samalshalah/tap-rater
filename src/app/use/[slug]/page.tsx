import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { useCases, getUseCaseBySlug } from "@/data/use-cases";
import { getStorefrontProductsByUseCase } from "@/lib/product-repository";

type UseCasePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: UseCasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCaseBySlug(slug);

  if (!useCase) {
    return { title: "Use Case Not Found" };
  }

  return {
    title: `${useCase.name} | Tap Rater`,
    description: useCase.description,
    alternates: {
      canonical: `/use/${useCase.slug}`
    },
    openGraph: {
      title: `${useCase.name} | Tap Rater`,
      description: useCase.description,
      url: `/use/${useCase.slug}`
    }
  };
}

export function generateStaticParams() {
  return useCases.map((useCase) => ({ slug: useCase.slug }));
}

export default async function UseCasePage({ params }: UseCasePageProps) {
  const { slug } = await params;
  const useCase = getUseCaseBySlug(slug);

  if (!useCase) {
    notFound();
  }

  const products = await getStorefrontProductsByUseCase(useCase.slug);

  return (
    <>
      <section className="border-b border-line bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Link href="/solutions" className="text-sm font-bold text-brand">
            All solutions
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase text-brand">Solution</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-ink md:text-5xl">{useCase.name}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{useCase.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">{products.length} products</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Recommended for {useCase.name.toLowerCase()}</h2>
          </div>
        </div>
        {products.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-md border border-line bg-gray-50 p-8 text-center">
            <p className="text-sm font-semibold text-ink">No products are tagged for this use case yet.</p>
            <Link href="/shop" className="mt-2 inline-block text-sm font-bold text-brand">
              Browse all products
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
