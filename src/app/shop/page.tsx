import type { Metadata } from "next";
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
      ? Boolean(selectedCategorySlug) &&
        product.categorySlug === selectedCategorySlug
      : true;
    const matchesUse = selectedUse
      ? selectedUse.productSlugs.includes(product.slug) ||
        product.businessUseSlugs?.includes(selectedUse.slug)
      : true;
    return matchesType && matchesUse;
  }), query);
  const { visibleCount, nextPage } = getShopResultWindow(filteredProducts.length, query.page);
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasFilters = Boolean(selectedType || selectedUse || query.q);

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell tone="soft" spacing="compact">
        <div
          id="stand-types"
          className="tr-container scroll-mt-24"
        >
          <div className="mb-6 max-w-3xl sm:mb-8">
            <p className="tr-eyebrow">Tap Rater shop</p>
            <h1 className="tr-page-title mt-4">Shop NFC and QR stands.</h1>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
            <div className="space-y-5 lg:sticky lg:top-24 lg:self-start lg:space-y-0">
              <div className="lg:hidden">
                <details key={`${selectedType?.slug ?? ""}:${selectedUse?.slug ?? ""}`} className="tr-card-compact group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                    <span className="flex min-h-12 items-center gap-2 px-4">
                      <SlidersHorizontal size={17} aria-hidden="true" />
                      Filters
                    </span>
                    <span className="px-4 text-brand">
                      {selectedType || selectedUse ? "Active" : "Type and use"}
                    </span>
                  </summary>
                  <div className="border-t border-line p-4">
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
              </div>

              <aside className="tr-card-compact hidden h-fit p-5 lg:block">
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
              <ShopControls query={query} />
              <p role="status" className="my-4 break-words text-sm text-muted">
                Showing {visibleCount} of {filteredProducts.length} products{query.q ? ` for "${query.q}"` : ""}
              </p>
              {hasFilters ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
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
                      density="catalog"
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

  return products.filter((product) => product.categorySlug === categorySlug).length;
}

function getPublicStandTypeLabel(standType: StandTypeForFilter) {
  if (standType.slug === "website-link-stands") {
    return "Website & Multi-Link Stands";
  }

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
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm font-semibold text-ink">Filters</p>
          <p className="mt-1 text-xs font-medium text-muted">
            {filteredProductCount} of {products.length} products
          </p>
        </div>
        {selectedType || selectedUse ? (
          <Link href={buildShopHref({ q: query.q, sort: query.sort })} prefetch={false} scroll={false} className="text-sm font-semibold text-brand">
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
    <div className="border-b border-line py-5 last:border-b-0 last:pb-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink">
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
      className={
        active
          ? "flex min-h-11 items-center justify-between gap-3 rounded-lg bg-panel px-3 py-2 text-sm font-semibold text-ink ring-1 ring-brand/20"
          : "flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-soft hover:text-ink"
      }
    >
      <span className="min-w-0">{label}</span>
      <span
        className={
          active
            ? "rounded-full bg-white px-2 py-0.5 text-xs text-brand ring-1 ring-line"
            : "rounded-full bg-soft px-2 py-0.5 text-xs text-muted"
        }
      >
        {count}
      </span>
    </Link>
  );
}
