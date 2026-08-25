import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { VisualCard } from "@/components/storefront/visual-card";
import type { CatalogCategorySlug } from "@/data/migrated-products";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCategoryVisual, productImageFallback } from "@/lib/storefront-visuals";

export const metadata: Metadata = {
  title: "Shop NFC and QR Tabletop Stands",
  description:
    "Shop Tap Rater tabletop NFC and QR stands for reviews, social media, booking, menus, feedback, websites, and custom links.",
  alternates: { canonical: "/shop" }
};

type ShopPageProps = {
  searchParams?: Promise<{
    type?: string;
    use?: string;
  }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = await searchParams;
  const [products, businessUses, standTypes] = await Promise.all([getStorefrontProducts(), getPublicBusinessUses(), getPublicStandTypes()]);
  const selectedType = resolveSelectedStandType(standTypes, filters?.type);
  const selectedUse = businessUses.find((businessUse) => businessUse.slug === filters?.use);
  const filteredProducts = products.filter((product) => {
    const selectedCategorySlug = selectedType ? standTypeToCategorySlug(selectedType.slug) : undefined;
    const matchesType = selectedType ? Boolean(selectedCategorySlug) && product.categorySlug === selectedCategorySlug : true;
    const matchesUse = selectedUse ? selectedUse.productSlugs.includes(product.slug) || product.businessUseSlugs?.includes(selectedUse.slug) : true;
    return matchesType && matchesUse;
  });

  return (
    <main className="bg-white text-ink">
      <section className="bg-white">
        <div className="tr-container py-8 sm:py-10 lg:py-12">
          <p className="tr-eyebrow">Tap Rater shop</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1fr] lg:items-end">
            <h1 className="max-w-3xl text-[2.35rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3rem]">
              Shop NFC and QR stands.
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-7 text-[#5f686f]">
              Browse by stand type or business use, then choose the product that fits the customer action.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8f8]">
        <div className="tr-container py-8 lg:py-10">
          <div id="stand-categories">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="tr-eyebrow">Shop by type</p>
                <h2 className="mt-2 text-[1.85rem] font-semibold leading-tight text-ink md:text-[2.25rem]">Choose the stand type.</h2>
              </div>
              <Link href="/shop" className="tr-editorial-link">
                View all products
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {standTypes.map((standType) => (
                <VisualCard
                  key={standType.slug}
                  cta="View products"
                  description={standType.shortDescription || standType.buyerIntent || standType.description || "Choose products for this stand type."}
                  href={buildShopHref({ type: standType.slug })}
                  image={getStandTypeCardVisual(standType)}
                  title={standType.title}
                  variant="type"
                />
              ))}
            </div>
          </div>

          <div id="business-uses" className="mt-12">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="tr-eyebrow">Shop by use</p>
                <h2 className="mt-2 text-[1.85rem] font-semibold leading-tight text-ink md:text-[2.25rem]">Choose the business use.</h2>
              </div>
              <Link href="/solutions" className="tr-editorial-link">
                View all uses
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {businessUses.map((businessUse) => (
                <VisualCard
                  key={businessUse.slug}
                  description={businessUse.shortDescription || businessUse.description || "Choose stands for this business use."}
                  href={buildShopHref({ use: businessUse.slug })}
                  image={getBusinessUseCardVisual(businessUse)}
                  title={businessUse.title}
                  variant="use-case"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="tr-container grid gap-8 border-t border-line pb-8 pt-10 lg:grid-cols-[340px_1fr] lg:pb-10">
          <aside className="h-fit rounded-[24px] bg-white p-5 ring-1 ring-line lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <p className="text-sm font-semibold text-ink">Filters</p>
              {(selectedType || selectedUse) ? (
                <Link href="/shop" className="text-sm font-semibold text-brand">
                  Clear all
                </Link>
              ) : null}
            </div>

            <FilterGroup title="Type">
              {standTypes.map((standType) => {
                const categorySlug = standTypeToCategorySlug(standType.slug);
                const count = categorySlug ? products.filter((product) => product.categorySlug === categorySlug).length : 0;
                return (
                <FilterLink
                  key={standType.slug}
                  active={selectedType?.slug === standType.slug}
                  count={count}
                  href={buildShopHref({ type: selectedType?.slug === standType.slug ? undefined : standType.slug, use: selectedUse?.slug })}
                  label={standType.title}
                />
                );
              })}
            </FilterGroup>

            <FilterGroup title="Use">
              {businessUses.map((businessUse) => (
                <FilterLink
                  key={businessUse.slug}
                  active={selectedUse?.slug === businessUse.slug}
                  count={products.filter((product) => businessUse.productSlugs.includes(product.slug) || product.businessUseSlugs?.includes(businessUse.slug)).length}
                  href={buildShopHref({ type: selectedType?.slug, use: selectedUse?.slug === businessUse.slug ? undefined : businessUse.slug })}
                  label={businessUse.title}
                />
              ))}
            </FilterGroup>
          </aside>

          <div>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="tr-eyebrow">All products</p>
                <h2 className="mt-2 text-[1.85rem] font-semibold leading-tight text-ink md:text-[2.25rem]">Shop every Tap Rater stand.</h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"} shown
                  {selectedType ? ` in ${selectedType.title}` : ""}
                  {selectedUse ? ` for ${selectedUse.title}` : ""}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedType ? (
                  <Link href={buildShopHref({ use: selectedUse?.slug })} className="tr-pill-neutral bg-white">
                    Type: {selectedType.title} ×
                  </Link>
                ) : null}
                {selectedUse ? (
                  <Link href={buildShopHref({ type: selectedType?.slug })} className="tr-pill-neutral bg-white">
                    Use: {selectedUse.title} ×
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => <ProductCard key={product.slug} product={product} density="compact" />)
              ) : (
                <div className="rounded-[24px] bg-white p-8 text-sm font-semibold text-muted ring-1 ring-line sm:col-span-2 xl:col-span-4">
                  No products match these filters. Clear filters to view all stands.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type StandTypeForFilter = Awaited<ReturnType<typeof getPublicStandTypes>>[number];
type BusinessUseForFilter = Awaited<ReturnType<typeof getPublicBusinessUses>>[number];

function resolveSelectedStandType(standTypes: StandTypeForFilter[], value: string | undefined) {
  if (!value) return undefined;
  return standTypes.find((standType) => standType.slug === value || standTypeToCategorySlug(standType.slug) === value);
}

function standTypeToCategorySlug(slug: string) {
  const map: Record<string, string> = {
    "review-stands": "reviews",
    "social-media-stands": "social-media",
    "appointment-reservation-stands": "appointments",
    "menu-info-stands": "menu",
    "feedback-survey-stands": "feedback",
    "website-link-stands": "website-links",
    "custom-stands": "custom-stands"
  };

  return map[slug];
}

function getStandTypeCardVisual(standType: StandTypeForFilter) {
  const categorySlug = standTypeToCategorySlug(standType.slug);
  if (standType.imageUrl) {
    return { src: standType.imageUrl, alt: standType.title };
  }

  if (standType.bannerImageUrl) {
    return { src: standType.bannerImageUrl, alt: standType.title };
  }

  const category = categorySlug ? getCategoryVisual({ slug: categorySlug as CatalogCategorySlug, title: standType.title }) : undefined;
  return category ?? { ...productImageFallback, alt: `${standType.title} stand` };
}

function getBusinessUseCardVisual(businessUse: BusinessUseForFilter) {
  const src = businessUse.bannerImageUrl || businessUse.imageUrl || productImageFallback.src;
  return { src, alt: businessUse.title };
}

function FilterGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="border-b border-line py-5 last:border-b-0 last:pb-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink">{title}</p>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function FilterLink({ active, count, href, label }: { active: boolean; count: number; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={active ? "flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfa] px-3 py-2 text-sm font-semibold text-ink" : "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-soft hover:text-ink"}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className={active ? "rounded-full bg-white px-2 py-0.5 text-xs text-brand ring-1 ring-line" : "rounded-full bg-soft px-2 py-0.5 text-xs text-muted"}>{count}</span>
    </Link>
  );
}

function buildShopHref({ type, use }: { type?: string; use?: string }) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (use) params.set("use", use);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}
