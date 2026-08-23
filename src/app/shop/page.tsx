import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { VisualCard } from "@/components/storefront/visual-card";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCatalogCategories } from "@/lib/products";
import { getCategoryVisual } from "@/lib/storefront-visuals";

export const metadata: Metadata = {
  title: "Shop NFC and QR Tabletop Stands",
  description:
    "Shop Tap Rater tabletop NFC and QR stands for reviews, social media, booking, menus, feedback, websites, and custom links.",
  alternates: { canonical: "/shop" }
};

export default async function ShopPage() {
  const products = await getStorefrontProducts();
  const categories = getCatalogCategories();

  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Tap Rater shop</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-4xl">Shop NFC and QR stands.</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">
            Pick the action first, then choose Standard Direct or Branded + QR on the product page.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="#all-stands" className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand">
              View all stands
            </Link>
            <Link href="/solutions" className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:border-ink">
              Shop by use
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Stand categories</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Browse by stand type.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              Category cards show the best available stand image. Some MVP media is temporary while final product photography is prepared.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <VisualCard
                key={category.slug}
                href={getCategoryHref(category.slug)}
                eyebrow={`${products.filter((product) => product.categorySlug === category.slug).length} stands`}
                title={category.title}
                description={category.buyerIntent}
                image={getCategoryVisual(category)}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="all-stands" className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">All stands</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Tap Rater catalog</h2>
            </div>
            <p className="text-sm font-medium text-muted">{products.length} stands available</p>
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
        </div>
      </section>
    </main>
  );
}

function getCategoryHref(slug: string) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}
