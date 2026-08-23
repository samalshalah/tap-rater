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
        <div className="tr-container tr-section-compact">
          <p className="tr-eyebrow">Tap Rater shop</p>
          <h1 className="tr-page-title mt-3 max-w-3xl">Shop NFC and QR stands.</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">
            Pick the action first, then choose Standard Direct or Branded + QR on the product page.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="#all-stands" className="tr-button-primary min-h-10">
              View all stands
            </Link>
            <Link href="/solutions" className="tr-button-outline min-h-10">
              Shop by use
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-soft">
        <div className="tr-container py-9">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="tr-eyebrow">Stand categories</p>
              <h2 className="tr-section-title mt-2">Browse by stand type.</h2>
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
        <div className="tr-container py-9">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="tr-eyebrow">All stands</p>
              <h2 className="tr-section-title mt-2">Tap Rater catalog</h2>
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
      </section>
    </main>
  );
}

function getCategoryHref(slug: string) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}
