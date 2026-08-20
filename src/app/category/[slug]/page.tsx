import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { catalogCategories } from "@/data/migrated-products";
import { getStorefrontProductsByCategory } from "@/lib/product-repository";
import { getCatalogCategories, getCategoryBySlug } from "@/lib/products";
import { getCategoryVisual } from "@/lib/storefront-visuals";

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
  const categories = getCatalogCategories();
  const visual = getCategoryVisual(category);

  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.45fr] lg:items-end lg:px-8">
          <div>
            <Link href="/shop" className="text-sm font-semibold text-brand">
              Shop all stands
            </Link>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{category.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-4xl">{category.title}</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">{category.description}</p>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-[#fafafa] lg:block">
            <Image src={visual.src} alt={visual.alt} fill unoptimized className="object-contain p-6" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            <Link
              href="/shop"
              className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink"
            >
              All stands
            </Link>
            {categories.map((item) => (
              <Link
                key={item.slug}
                href={`/category/${item.slug}`}
                className={
                  item.slug === category.slug
                    ? "inline-flex min-h-9 shrink-0 items-center rounded-full bg-brand px-4 text-[13px] font-semibold text-white"
                    : "inline-flex min-h-9 shrink-0 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink"
                }
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{products.length} stands</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Shop {category.title.toLowerCase()}</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Choose Standard Direct for one clean link, or Branded + QR when you want logo/business-name proofing before printing.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.length > 0 ? (
            products.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : (
            <div className="rounded-[18px] border border-line bg-[#f7f8fa] p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
              Products are being prepared.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
