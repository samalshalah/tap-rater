import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { SectionShell } from "@/components/storefront/section";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProducts } from "@/lib/product-repository";

export const metadata: Metadata = {
  title: "Shop NFC and QR Tabletop Stands",
  description:
    "Shop Tap Rater tabletop NFC and QR stands for reviews, social media, booking, menus, feedback, websites, and custom links.",
  alternates: { canonical: "/shop" },
};

type ShopPageProps = {
  searchParams?: Promise<{
    type?: string;
    use?: string;
  }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = await searchParams;
  const [products, businessUses, standTypes] = await Promise.all([
    getStorefrontProducts(),
    getPublicBusinessUses(),
    getPublicStandTypes(),
  ]);
  const selectedType = resolveSelectedStandType(standTypes, filters?.type);
  const selectedUse = businessUses.find(
    (businessUse) => businessUse.slug === filters?.use,
  );
  const filteredProducts = products.filter((product) => {
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
  });

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container">
          <p className="tr-eyebrow">Tap Rater shop</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1fr] lg:items-end">
            <h1 className="tr-page-title max-w-3xl">
              Shop NFC and QR stands.
            </h1>
            <p className="tr-body max-w-2xl text-[1.05rem]">
              Browse by stand type or business use, then choose the product that
              fits the customer action.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <div
          id="stand-types"
          className="tr-container scroll-mt-24"
        >
          <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
            <div className="lg:hidden">
              <details className="tr-card-compact group p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                  <span className="flex min-h-12 items-center gap-2 px-4">
                    <SlidersHorizontal size={17} aria-hidden="true" />
                    Filters
                  </span>
                  <span className="px-4 text-brand">
                    {selectedType || selectedUse ? "Active" : "Type and use"}
                  </span>
                </summary>
                <div className="mt-4 border-t border-line pt-4">
                  <FilterPanelContent
                    businessUses={businessUses}
                    products={products}
                    selectedType={selectedType}
                    selectedUse={selectedUse}
                    standTypes={standTypes}
                  />
                </div>
              </details>
            </div>

            <aside className="tr-card-compact hidden h-fit p-5 lg:sticky lg:top-24 lg:block">
              <FilterPanelContent
                businessUses={businessUses}
                products={products}
                selectedType={selectedType}
                selectedUse={selectedUse}
                standTypes={standTypes}
              />
            </aside>

            <div>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="tr-eyebrow">All products</p>
                  <p className="mt-1 text-sm font-medium text-muted">
                    {filteredProducts.length} of {products.length} products shown.
                  </p>
                </div>
                {selectedType || selectedUse ? (
                  <Link href="/shop" className="tr-button-outline w-fit">
                    Reset filters
                  </Link>
                ) : null}
              </div>

              {selectedType || selectedUse ? (
                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedType ? (
                    <Link
                      href={buildShopHref({ use: selectedUse?.slug })}
                      className="tr-pill-neutral bg-white"
                    >
                      Type: {selectedType.title} ×
                    </Link>
                  ) : null}
                  {selectedUse ? (
                    <Link
                      href={buildShopHref({ type: selectedType?.slug })}
                      className="tr-pill-neutral bg-white"
                    >
                      Use: {selectedUse.title} ×
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ProductCard
                      key={product.slug}
                      product={product}
                      density="compact"
                    />
                  ))
                ) : (
                  <div className="tr-card p-8 text-sm font-semibold text-muted sm:col-span-2 xl:col-span-4">
                    No products match these filters. Clear filters to view all
                    stands.
                  </div>
                )}
              </div>
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
  products,
  selectedType,
  selectedUse,
  standTypes,
}: {
  businessUses: BusinessUseForFilter[];
  products: ProductForFilter[];
  selectedType?: StandTypeForFilter;
  selectedUse?: BusinessUseForFilter;
  standTypes: StandTypeForFilter[];
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-sm font-semibold text-ink">Filters</p>
        {selectedType || selectedUse ? (
          <Link href="/shop" className="text-sm font-semibold text-brand">
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
      className={
        active
          ? "flex min-h-11 items-center justify-between gap-3 rounded-lg bg-panel px-3 py-2 text-sm font-semibold text-ink ring-1 ring-brand/20"
          : "flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-soft hover:text-ink"
      }
    >
      <span className="min-w-0 truncate">{label}</span>
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

function buildShopHref({ type, use }: { type?: string; use?: string }) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (use) params.set("use", use);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}
