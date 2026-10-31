import styles from "@/components/storefront/type-pages.module.css";
import type { Metadata } from "next";
import { PrismaticWave } from "@/components/prismatic/motion";
import Link from "next/link";
import { Plus, SearchX, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { ShopControls } from "@/components/product/shop-controls";
import { SectionShell } from "@/components/storefront/section";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getShopResultWindow, searchAndSortShopProducts } from "@/lib/shop-catalog";
import { buildShopHref, normalizeShopQuery, type ShopQuery, type ShopSearchParams } from "@/lib/shop-query";
import { productMatchesCategory } from "@/lib/category-products";

export const metadata: Metadata = {
  title: "Shop NFC and QR Tabletop Stands",
  description:
    "Shop Tap Rater tabletop NFC and QR stands for reviews, social media, booking, menus, feedback, websites, and custom links.",
  alternates: { canonical: "/shop" },
};

type ShopPageProps = {
  searchParams?: Promise<ShopSearchParams>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = normalizeShopQuery(await searchParams);
  const [products, businessUses, standTypes] = await Promise.all([
    getStorefrontProducts(),
    getPublicBusinessUses(),
    getPublicStandTypes(),
  ]);
  const selectedType = resolveSelectedStandType(standTypes, filters?.type);
  const selectedUse = businessUses.find(
    (businessUse) => businessUse.slug === filters?.use,
  );
  const query: ShopQuery = { ...filters, type: selectedType?.slug, use: selectedUse?.slug };
  const filteredProducts = searchAndSortShopProducts(products.filter((product) => {
    const selectedCategorySlug = selectedType
      ? standTypeToCategorySlug(selectedType.slug)
      : undefined;
    const matchesType = selectedType
      ? selectedCategorySlug !== undefined &&
        productMatchesCategory(product, selectedCategorySlug)
      : true;
    const matchesUse = selectedUse
      ? selectedUse.productSlugs.includes(product.slug) ||
        product.businessUseSlugs?.includes(selectedUse.slug)
      : true;
    return matchesType && matchesUse;
  }), query);
  const { visibleCount, nextPage } = getShopResultWindow(filteredProducts.length, query.page);
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasFilters = Boolean(selectedType || selectedUse || query.design || query.q);


  return (
    <main className="tr-public-shell text-ink">
      <SectionShell tone="soft" spacing="compact">
        <div
          id="stand-types"
          className="tr-container scroll-mt-24"
        >
          <div className="tr-prismatic-shop-intro mb-6 sm:mb-8">
            <PrismaticWave variant="banner" />
            <p className="tr-eyebrow">Tap Rater shop</p>
            <h1 className="tr-page-title mt-4">{query.design === "branded" ? "Stands with Branded + QR." : "Shop NFC and QR stands."}</h1>
            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">Shop custom NFC and QR tabletop stands for Google reviews, social media, menus, bookings, and customer feedback. Every stand includes your logo and business name. Choose your stand and approve your design before payment.</p>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
            <div className="hidden space-y-5 lg:block lg:sticky lg:top-24 lg:self-start lg:space-y-0">
              <aside className={`${styles.filterPanel} hidden h-fit lg:block`}>
                <FilterPanelContent
                  businessUses={businessUses}
                  filteredProductCount={filteredProducts.length}
                  products={products}
                  selectedType={selectedType}
                  selectedUse={selectedUse}
                  standTypes={standTypes}
                  query={query}
                />
              </aside>
            </div>

            <div className="min-w-0 self-start" id="shop-results">
              <ShopControls query={query} filters={<div className="min-w-0 lg:hidden">
                <details key={`${selectedType?.slug ?? ""}:${selectedUse?.slug ?? ""}`} className="group">
                  <summary className="flex h-11 cursor-pointer list-none items-center justify-center rounded-md bg-[#090e36] text-xs font-semibold text-white [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-1 px-2">
                      <SlidersHorizontal size={17} aria-hidden="true" />
                      Filters
                    </span>
                  </summary>
                  <div className={`${styles.filterPanel} absolute inset-x-0 top-full z-30 mt-2 max-h-[65dvh] overflow-y-auto shadow-xl`}>
                    <FilterPanelContent
                      businessUses={businessUses}
                      filteredProductCount={filteredProducts.length}
                      products={products}
                      selectedType={selectedType}
                      selectedUse={selectedUse}
                      standTypes={standTypes}
                      query={query}
                    />
                  </div>
                </details>
              </div>} />
              <p role="status" className="my-4 break-words text-sm text-muted">
                Showing {visibleCount} of {filteredProducts.length} products{query.q ? ` for "${query.q}"` : ""}
              </p>
              {hasFilters ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {query.design ? (
                      <Link href={buildShopHref({ ...query, design: undefined, page: undefined })} prefetch={false} scroll={false}
                        aria-label="Remove Branded + QR filter" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand">
                        Branded + QR <X size={14} aria-hidden="true" />
                      </Link>
                    ) : null}
                    {selectedType ? (
                      <Link
                        href={buildShopHref({ ...query, type: undefined, page: undefined })}
                        prefetch={false}
                        scroll={false}
                        aria-label={`Remove type filter: ${selectedType.title}`}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
                      >
                        {selectedType.title} <X size={14} aria-hidden="true" />
                      </Link>
                    ) : null}
                    {selectedUse ? (
                      <Link
                        href={buildShopHref({ ...query, use: undefined, page: undefined })}
                        prefetch={false}
                        scroll={false}
                        aria-label={`Remove use filter: ${selectedUse.title}`}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
                      >
                        {selectedUse.title} <X size={14} aria-hidden="true" />
                      </Link>
                    ) : null}
                    {query.q ? (
                      <Link href={buildShopHref({ ...query, q: undefined, page: undefined })} prefetch={false} scroll={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand">
                        Clear search <X size={14} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                  <Link href="/shop" prefetch={false} scroll={false} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">
                    Reset all
                  </Link>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4 xl:gap-4">
                {visibleProducts.length > 0 ? (
                  visibleProducts.map((product) => (
                    <ProductCard
                      key={product.slug}
                      product={product}
                      design={query.design}
                    />
                  ))
                ) : (
                  <div className="col-span-full grid justify-items-start gap-3 border-y border-line py-10">
                    <SearchX size={24} className="text-muted" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-ink">No matching stands</h2>
                    <Link href="/shop" prefetch={false} scroll={false} className="tr-button-outline">View all stands</Link>
                  </div>
                )}
              </div>
              {nextPage ? (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Link href={buildShopHref({ ...query, page: nextPage })} prefetch={false} scroll={false} className="tr-button-outline gap-2" aria-label="Load more products">
                    <Plus size={16} aria-hidden="true" /> Load more
                  </Link>
                  <p className="text-xs text-muted">{filteredProducts.length - visibleCount} more products</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}

type StandTypeForFilter = Awaited<
  ReturnType<typeof getPublicStandTypes>
>[number];

function resolveSelectedStandType(
  standTypes: StandTypeForFilter[],
  value: string | undefined,
) {
  if (!value) return undefined;
  return standTypes.find(
    (standType) =>
      standType.slug === value ||
      standTypeToCategorySlug(standType.slug) === value,
  );
}

function standTypeToCategorySlug(slug: string) {
  const map: Record<string, string> = {
    "review-stands": "reviews",
    "social-media-stands": "social-media",
    "appointment-reservation-stands": "appointments",
    "menu-info-stands": "menu",
    "feedback-survey-stands": "feedback",
    "website-link-stands": "website-links",
    "custom-stands": "custom-stands",
  };

  return map[slug];
}

type BusinessUseForFilter = Awaited<
  ReturnType<typeof getPublicBusinessUses>
>[number];
type ProductForFilter = Awaited<
  ReturnType<typeof getStorefrontProducts>
>[number];

function getStandTypeProductCount(slug: string, products: ProductForFilter[]) {
  const categorySlug = standTypeToCategorySlug(slug);
  if (!categorySlug) {
    return 0;
  }

  return products.filter((product) => productMatchesCategory(product, categorySlug)).length;
}

function getPublicStandTypeLabel(standType: StandTypeForFilter) {
  return standType.title;
}

function FilterPanelContent({
  businessUses,
  filteredProductCount,
  products,
  selectedType,
  selectedUse,
  standTypes,
  query,
}: {
  businessUses: BusinessUseForFilter[];
  filteredProductCount: number;
  products: ProductForFilter[];
  selectedType?: StandTypeForFilter;
  selectedUse?: BusinessUseForFilter;
  standTypes: StandTypeForFilter[];
  query: ShopQuery;
}) {
  return (
    <>
      <div className={styles.filterHeader}>
        <div>
          <p className={styles.filterHeading}>Filters</p>
          <p className={styles.filterTotal}>
            {filteredProductCount} of {products.length} products
          </p>
        </div>
        {selectedType || selectedUse || query.design ? (
          <Link href={buildShopHref({ q: query.q, sort: query.sort })} prefetch={false} scroll={false} className={styles.filterClear}>
            Clear all
          </Link>
        ) : null}
      </div>

      <FilterGroup title="Type">
        {standTypes.map((standType) => {
          const count = getStandTypeProductCount(standType.slug, products);
          if (count === 0 && selectedType?.slug !== standType.slug) {
            return null;
          }

          return (
            <FilterLink
              key={standType.slug}
              active={selectedType?.slug === standType.slug}
              count={count}
              href={buildShopHref({
                design: query.design,
                q: query.q,
                sort: query.sort,
                type:
                  selectedType?.slug === standType.slug
                    ? undefined
                    : standType.slug,
                use: selectedUse?.slug,
              })}
              label={getPublicStandTypeLabel(standType)}
            />
          );
        })}
      </FilterGroup>

      <FilterGroup title="Use">
        {businessUses.map((businessUse) => (
          <FilterLink
            key={businessUse.slug}
            active={selectedUse?.slug === businessUse.slug}
            count={
              products.filter(
                (product) =>
                  businessUse.productSlugs.includes(product.slug) ||
                  product.businessUseSlugs?.includes(businessUse.slug),
              ).length
            }
            href={buildShopHref({
              design: query.design,
              q: query.q,
              sort: query.sort,
              type: selectedType?.slug,
              use:
                selectedUse?.slug === businessUse.slug
                  ? undefined
                  : businessUse.slug,
            })}
            label={businessUse.title}
          />
        ))}
      </FilterGroup>
    </>
  );
}

function FilterGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className={styles.filterGroup}>
      <p className={styles.filterLabel}>
        {title}
      </p>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function FilterLink({
  active,
  count,
  href,
  label,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "true" : undefined}
      className={styles.filterLink}
    >
      <span className="min-w-0">{label}</span>
      <span className={styles.filterCount}>{count}</span>
    </Link>
  );
}
