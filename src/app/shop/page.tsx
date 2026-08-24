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
      <section className="bg-white">
        <div className="tr-container grid gap-8 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:py-16">
          <div>
          <p className="tr-eyebrow">Tap Rater shop</p>
            <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.25rem]">
              Shop NFC and QR stands.
            </h1>
          </div>
          <div>
            <p className="text-xl font-medium leading-8 text-[#5f686f]">
              Pick the action first, then configure a stand with QR and NFC connected directly to your destination.
          </p>
            <div className="mt-7 flex flex-wrap gap-4">
            <Link href="#all-stands" className="tr-button-primary min-h-10">
              View all stands
            </Link>
              <Link href="/solutions" className="tr-editorial-link">
              Shop by use
                <span aria-hidden="true">→</span>
            </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="stand-categories" className="bg-[#f7f8f8]">
        <div className="tr-container py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="tr-eyebrow">Stand categories</p>
              <h2 className="mt-3 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.45rem]">Browse by stand type.</h2>
            </div>
            <p className="max-w-xl text-sm font-medium leading-6 text-muted">
              Use categories when you already know the kind of counter action you need.
            </p>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <VisualCard
                key={category.slug}
                href={getCategoryHref(category.slug)}
                eyebrow={`${products.filter((product) => product.categorySlug === category.slug).length} stands`}
                title={category.title}
                description={category.buyerIntent}
                image={getCategoryVisual(category)}
                cta="Learn more"
                density="compact"
              />
            ))}
          </div>
        </div>
      </section>

      <section id="all-stands" className="bg-white">
        <div className="tr-container grid gap-8 py-10 lg:grid-cols-[240px_1fr] lg:py-14">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="tr-eyebrow">Filter</p>
            <div className="mt-4 flex max-w-full flex-wrap gap-2 pb-2 lg:grid lg:pb-0">
              <Link href="/shop" className="tr-button-primary min-h-10 px-4 text-[13px]">All Stands</Link>
              {categories.map((category) => (
                <Link key={category.slug} href={getCategoryHref(category.slug)} className="tr-button-outline min-h-10 px-4 text-[13px]">
                  {category.title}
                </Link>
              ))}
            </div>
          </aside>
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
              <p className="tr-eyebrow">All stands</p>
                <h2 className="mt-2 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.35rem]">Tap Rater catalog</h2>
            </div>
            <p className="text-sm font-medium text-muted">{products.length} stands available</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.length > 0 ? (
              products.map((product) => <ProductCard key={product.slug} product={product} />)
            ) : (
              <div className="tr-panel-muted p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
                Products are being prepared.
              </div>
            )}
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function getCategoryHref(slug: string) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}
