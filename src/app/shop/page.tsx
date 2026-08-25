import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCatalogCategories } from "@/lib/products";

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
  const [products, businessUses] = await Promise.all([getStorefrontProducts(), getPublicBusinessUses()]);
  const categories = getCatalogCategories();
  const selectedType = categories.find((category) => category.slug === filters?.type);
  const selectedUse = businessUses.find((businessUse) => businessUse.slug === filters?.use);
  const filteredProducts = products.filter((product) => {
    const matchesType = selectedType ? product.categorySlug === selectedType.slug : true;
    const matchesUse = selectedUse ? selectedUse.productSlugs.includes(product.slug) || product.businessUseSlugs?.includes(selectedUse.slug) : true;
    return matchesType && matchesUse;
  });

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
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8f8]">
        <div className="tr-container grid gap-8 py-10 lg:grid-cols-[280px_1fr] lg:py-14">
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
              {categories.map((category) => (
                <FilterLink
                  key={category.slug}
                  active={selectedType?.slug === category.slug}
                  count={products.filter((product) => product.categorySlug === category.slug).length}
                  href={buildShopHref({ type: selectedType?.slug === category.slug ? undefined : category.slug, use: selectedUse?.slug })}
                  label={category.title}
                />
              ))}
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
                <h2 className="mt-3 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.45rem]">Shop every Tap Rater stand.</h2>
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

            <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => <ProductCard key={product.slug} product={product} />)
              ) : (
                <div className="rounded-[24px] bg-white p-8 text-sm font-semibold text-muted ring-1 ring-line sm:col-span-2 xl:col-span-3 2xl:col-span-4">
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
