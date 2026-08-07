import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { catalogCategories } from "@/data/migrated-products";
import { getStorefrontProductsByCategory } from "@/lib/product-repository";
import { getCategoryBySlug } from "@/lib/products";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category Not Found"
    };
  }

  return {
    title: category.seoTitle.replace(" | Tap Rater", ""),
    description: category.seoDescription,
    alternates: {
      canonical: `/category/${category.slug}`
    },
    openGraph: {
      title: category.seoTitle,
      description: category.seoDescription,
      url: `/category/${category.slug}`
    }
  };
}

export function generateStaticParams() {
  return catalogCategories.flatMap((category) => [category.slug, ...(category.aliases ?? [])].map((slug) => ({ slug })));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const products = await getStorefrontProductsByCategory(category.slug);

  return (
    <>
      <section className="border-b border-line bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Link href="/shop" className="text-sm font-bold text-brand">
            Shop all stands
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase text-brand">{category.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-ink md:text-5xl">{category.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{category.description}</p>
          <div className="mt-6 grid gap-3 rounded-md border border-line bg-white p-5 md:grid-cols-[0.7fr_1.3fr]">
            <p className="text-sm font-bold uppercase text-ink">Best for</p>
            <p className="text-sm leading-6 text-muted">{category.buyerIntent}</p>
          </div>
          <div className="mt-4 grid gap-3 rounded-md border border-line bg-white p-5 md:grid-cols-[0.7fr_1.3fr]">
            <p className="text-sm font-bold uppercase text-ink">Service expectation</p>
            <p className="text-sm leading-6 text-muted">{category.seoCopy}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">{products.length} stands</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Shop {category.title.toLowerCase()}</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            These stands are selected for the same customer action first. Choose Standard Direct for a fast one-link setup, or Branded + QR Direct when you need business-name branding with logo collection and final proof after checkout.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}
