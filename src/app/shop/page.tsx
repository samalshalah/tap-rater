import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { VisualCard } from "@/components/storefront/visual-card";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
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
  const [products, businessUses] = await Promise.all([getStorefrontProducts(), getPublicBusinessUses()]);
  const categories = getCatalogCategories();
  const visibleBusinessUses = businessUses.filter((useCase) => Boolean(useCase.imageUrl || useCase.bannerImageUrl));

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
              Browse by stand type or business use, then choose the product that fits the customer action.
          </p>
            <div className="mt-7 flex flex-wrap gap-4">
            <Link href="#stand-categories" className="tr-button-primary min-h-10">
              Shop by type
            </Link>
              <Link href="#business-uses" className="tr-editorial-link">
              Shop by use
                <span aria-hidden="true">→</span>
            </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="all-products" className="bg-[#f7f8f8]">
        <div className="tr-container py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="tr-eyebrow">All products</p>
              <h2 className="mt-3 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.45rem]">Shop every Tap Rater stand.</h2>
            </div>
            <p className="max-w-xl text-sm font-medium leading-6 text-muted">
              Compare every active product, then choose Standard Direct or a supported branded setup on the product page.
            </p>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section id="stand-categories" className="bg-[#f7f8f8]">
        <div className="tr-container py-10 sm:py-14">
          <div className="grid gap-8 rounded-[30px] bg-white p-6 md:grid-cols-[0.82fr_1fr] md:items-center lg:p-8">
            <div>
              <p className="tr-eyebrow">Stand categories</p>
              <h2 className="mt-3 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.45rem]">Shop by type.</h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-muted">
                Use stand types when you already know the customer action you want at the counter.
              </p>
            </div>
            <div className="relative min-h-[260px] overflow-hidden rounded-[26px] bg-[#f7f8f8]">
              <img src="/uploads/products/google-review-stand.png" alt="Tap Rater stand type example" className="h-full min-h-[260px] w-full object-contain p-6 mix-blend-multiply" />
            </div>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <VisualCard
                key={category.slug}
                href={getCategoryHref(category.slug)}
                eyebrow={`${products.filter((product) => product.categorySlug === category.slug).length} stands`}
                title={category.title}
                description={category.buyerIntent}
                image={getCategoryVisual(category)}
                cta="Learn more"
                variant="type"
              />
            ))}
          </div>
        </div>
      </section>

      <section id="business-uses" className="bg-white">
        <div className="tr-container py-10 sm:py-14">
          <div className="grid gap-8 rounded-[30px] bg-[#f7f8f8] p-6 md:grid-cols-[0.82fr_1fr] md:items-center lg:p-8">
            <div>
              <p className="tr-eyebrow">Shop by use</p>
              <h2 className="mt-3 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.45rem]">Find stands for your business.</h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-muted">
                Start with your industry or environment, then choose the stand that fits the customer moment.
              </p>
              <Link href="/solutions" className="mt-5 tr-editorial-link">
                View all use cases
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="relative min-h-[260px] overflow-hidden rounded-[26px] bg-white">
              <img src="/uploads/use-cases/restaurants-cafes.webp" alt="Restaurant business use example" className="h-full min-h-[260px] w-full object-cover" />
            </div>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBusinessUses.slice(0, 8).map((useCase) => (
              <VisualCard
                key={useCase.slug}
                href={`/solutions/${useCase.slug}`}
                title={useCase.title}
                description={useCase.shortDescription || useCase.description}
                image={{
                  src: useCase.bannerImageUrl ?? useCase.imageUrl ?? "/uploads/products/rate-your-experience-stand.png",
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

function getCategoryHref(slug: string) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}
