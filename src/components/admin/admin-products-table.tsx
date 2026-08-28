"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import type { MigratedProduct, ProductKind } from "@/data/migrated-products";
import type { BusinessUse, PlatformDestination, StandType } from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind, getProductAssetReadiness, inferProductKind } from "@/lib/catalog-architecture";
import { getBrandedProductionTemplateReadiness, type BrandedTemplateReadiness } from "@/lib/admin-product-readiness";
import { formatPrice } from "@/lib/products";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminIconButton,
  AdminInput,
  AdminLinkButton,
  AdminResponsiveTable,
  AdminSelect
} from "./admin-ui";

type AdminProductsTableProps = {
  products: MigratedProduct[];
  standTypes: StandType[];
  businessUses: BusinessUse[];
  platforms: PlatformDestination[];
  canDelete: boolean;
};

type DeleteStatus = {
  tone: "success" | "error";
  message: string;
} | null;

type Filters = {
  search: string;
  standType: string;
  businessUse: string;
  platform: string;
  status: string;
  assetReadiness: string;
  specialSolution: string;
};

const defaultFilters: Filters = {
  search: "",
  standType: "",
  businessUse: "",
  platform: "",
  status: "",
  assetReadiness: "",
  specialSolution: ""
};

export function AdminProductsTable({
  products: initialProducts,
  standTypes,
  businessUses,
  platforms,
  canDelete
}: AdminProductsTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [mobileFilters, setMobileFilters] = useState<Filters>(defaultFilters);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<DeleteStatus>(null);

  useEffect(() => {
    setMobileFilters(filters);
  }, [filters]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const productStatus = getProductStatus(product);
      const productKind = getProductKind(product);
      const assetStatus = getProductAssetReadiness(product, getDefaultOptionsForProductKind(productKind)).status;
      const businessUseSlugs = product.businessUseSlugs ?? [];
      const searchText = [product.title, product.slug, product.sku, product.primaryPlatformSlug, product.destinationType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!filters.search || searchText.includes(filters.search.toLowerCase())) &&
        (!filters.standType || product.standTypeSlug === filters.standType) &&
        (!filters.businessUse || businessUseSlugs.includes(filters.businessUse)) &&
        (!filters.platform || product.primaryPlatformSlug === filters.platform) &&
        (!filters.status || productStatus === filters.status) &&
        (!filters.assetReadiness || assetStatus === filters.assetReadiness) &&
        (!filters.specialSolution ||
          (filters.specialSolution === "yes" ? product.isSpecialSolution === true : product.isSpecialSolution !== true))
      );
    });
  }, [filters, products]);

  const allSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedSlugs.has(product.slug));
  const selectedProductTitles = useMemo(
    () => products.filter((product) => selectedSlugs.has(product.slug)).map((product) => product.title),
    [products, selectedSlugs]
  );

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setMobileFilters(defaultFilters);
  }

  function updateMobileFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setMobileFilters((current) => ({ ...current, [key]: value }));
  }

  function applyMobileFilters() {
    setFilters(mobileFilters);
    setStatus(null);
  }

  function toggleSelectAll() {
    setStatus(null);
    setSelectedSlugs((current) => {
      const next = new Set(current);
      if (allSelected) {
        for (const product of filteredProducts) next.delete(product.slug);
      } else {
        for (const product of filteredProducts) next.add(product.slug);
      }
      return next;
    });
  }

  function toggleProduct(slug: string) {
    setStatus(null);
    setSelectedSlugs((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  async function deleteProducts(slugs: string[], label: string) {
    if (!canDelete || slugs.length === 0 || isDeleting) return;
    const confirmation =
      slugs.length === 1 ? `Delete ${label}? This cannot be undone.` : `Delete ${slugs.length} selected products? This cannot be undone.`;
    if (!window.confirm(confirmation)) return;

    setIsDeleting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs })
      });
      const payload = (await response.json().catch(() => null)) as { deletedSlugs?: string[]; error?: string } | null;

      if (!response.ok || !payload?.deletedSlugs) {
        throw new Error(payload?.error ?? "Products could not be deleted.");
      }

      const deleted = new Set(payload.deletedSlugs);
      if (deleted.size === 0) {
        setStatus({ tone: "error", message: "No matching products were deleted." });
        return;
      }

      setProducts((current) => current.filter((product) => !deleted.has(product.slug)));
      setSelectedSlugs((current) => new Set([...current].filter((slug) => !deleted.has(slug))));
      setStatus({ tone: "success", message: `${deleted.size} product${deleted.size === 1 ? "" : "s"} deleted.` });
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Products could not be deleted."
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-line bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">Catalog</p>
        <h2 className="mt-3 text-2xl font-black text-ink">No products yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Create your first Tap Rater stand product.</p>
        <AdminLinkButton className="mt-6" variant="primary" href="/admin/products/new">
          Add product
        </AdminLinkButton>
      </div>
    );
  }

  return (
    <div className="tr-admin-table-shell mt-6 overflow-hidden">
      <div className="border-b border-line p-4 lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </span>
            <span className="text-xs uppercase tracking-[0.04em] text-muted group-open:hidden">Open</span>
            <span className="hidden text-xs uppercase tracking-[0.04em] text-muted group-open:inline">Close</span>
          </summary>
          <div className="mt-3 grid gap-3">
            <ProductFilters
              filters={mobileFilters}
              standTypes={standTypes}
              businessUses={businessUses}
              platforms={platforms}
              onChange={updateMobileFilter}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <AdminButton type="button" variant="primary" onClick={applyMobileFilters}>
                Apply filters
              </AdminButton>
              <AdminButton type="button" variant="outline" onClick={resetFilters}>
                Reset
              </AdminButton>
            </div>
          </div>
        </details>
      </div>

      <div className="hidden gap-3 border-b border-line p-4 lg:grid lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <ProductFilters
          filters={filters}
          standTypes={standTypes}
          businessUses={businessUses}
          platforms={platforms}
          onChange={updateFilter}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted">
          Showing <span className="font-bold text-ink">{filteredProducts.length}</span> of{" "}
          <span className="font-bold text-ink">{products.length}</span> products.
          {selectedSlugs.size > 0 ? <span> {selectedSlugs.size} selected.</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton type="button" variant="outline" onClick={resetFilters}>
            Reset filters
          </AdminButton>
          <AdminButton
            type="button"
            variant="danger"
            disabled={!canDelete || selectedSlugs.size === 0 || isDeleting}
            onClick={() => deleteProducts([...selectedSlugs], selectedProductTitles.slice(0, 2).join(", "))}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete selected
          </AdminButton>
        </div>
      </div>
      {status ? (
        <AdminAlert tone={status.tone === "success" ? "success" : "danger"} className="rounded-none border-x-0 border-t-0 px-4 py-3">
          {status.message}
        </AdminAlert>
      ) : null}
      <AdminResponsiveTable
        className="rounded-none border-0 shadow-none"
        table={
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-[#f7f8fa] text-xs uppercase text-muted">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-brand"
                  checked={allSelected}
                  disabled={filteredProducts.length === 0 || isDeleting}
                  aria-label="Select all filtered products"
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 w-[92px]">Image</th>
              <th className="px-4 py-3 w-[230px]">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3 w-[130px]">Price</th>
              <th className="px-4 py-3">Readiness</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const productKind = getProductKind(product);
              const options = getDefaultOptionsForProductKind(productKind).filter((option) => option.isActive);
              const readiness = getProductAssetReadiness(product, options);
              const brandedReadiness = getBrandedProductionTemplateReadiness(product, options);
              const productReady = isProductListReady(readiness.status, brandedReadiness, getMediaWarnings(product));

              return (
                <tr
                  className={
                    selectedSlugs.has(product.slug)
                      ? "border-b border-line bg-teal-50/40 last:border-b-0"
                      : "border-b border-line hover:bg-gray-50/70 last:border-b-0"
                  }
                  key={product.slug}
                >
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line accent-brand"
                      checked={selectedSlugs.has(product.slug)}
                      disabled={isDeleting}
                      aria-label={`Select ${product.title}`}
                      onChange={() => toggleProduct(product.slug)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ProductThumbnail product={product} />
                  </td>
                  <td className="px-4 py-3">
                    <Link className="block font-semibold text-ink hover:text-brand" href={`/admin/products/${product.slug}`}>
                      {product.title}
                    </Link>
                    <span className="mt-1 block text-xs text-muted">{product.sku || product.slug}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{findTitle(standTypes, product.standTypeSlug) ?? "-"}</td>
                  <td className="px-4 py-3 text-muted">{formatBusinessUses(product, businessUses)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatPriceRange(options, product)}</td>
                  <td className="px-4 py-3">
                    <ReadinessYesNoBadge ready={productReady} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={getProductStatus(product)} />
                    <StockBadge stockStatus={product.stockStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <AdminLinkButton className="min-h-9 px-3 py-1.5 text-xs" variant="outline" href={`/admin/products/${product.slug}`}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </AdminLinkButton>
                      <AdminIconButton
                        type="button"
                        className="h-9 w-9"
                        variant="danger"
                        disabled={!canDelete || isDeleting}
                        label={`Delete ${product.title}`}
                        onClick={() => deleteProducts([product.slug], product.title)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </AdminIconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 ? (
              <tr>
                <td className="p-10 text-center text-muted" colSpan={9}>
                  No products match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        }
        cards={
          filteredProducts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No products match these filters.</p>
          ) : (
            filteredProducts.map((product) => {
              const productKind = getProductKind(product);
              const options = getDefaultOptionsForProductKind(productKind).filter((option) => option.isActive);
              const readiness = getProductAssetReadiness(product, options);
              const brandedReadiness = getBrandedProductionTemplateReadiness(product, options);
              const productReady = isProductListReady(readiness.status, brandedReadiness, getMediaWarnings(product));

              return (
                <article key={product.slug} className={selectedSlugs.has(product.slug) ? "rounded-xl border border-brand bg-teal-50/40 p-4" : "rounded-xl border border-line bg-white p-4"}>
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-line accent-brand"
                      checked={selectedSlugs.has(product.slug)}
                      disabled={isDeleting}
                      aria-label={`Select ${product.title}`}
                      onChange={() => toggleProduct(product.slug)}
                    />
                    <ProductThumbnail product={product} />
                    <div className="min-w-0 flex-1">
                      <Link className="block font-semibold leading-5 text-ink hover:text-brand" href={`/admin/products/${product.slug}`}>
                        {product.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">{product.sku || product.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge status={getProductStatus(product)} />
                        <StockBadge stockStatus={product.stockStatus} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <ProductMobileField label="Type" value={findTitle(standTypes, product.standTypeSlug) ?? "-"} />
                    <ProductMobileField label="Uses" value={formatBusinessUses(product, businessUses)} />
                    <ProductMobileField label="Price" value={formatPriceRange(options, product)} strong />
                    <ProductMobileField label="Readiness" value={productReady ? "Yes" : "No"} strong={productReady} />
                  </dl>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <AdminLinkButton className="min-h-9 px-3 py-1.5 text-xs" variant="outline" href={`/admin/products/${product.slug}`}>
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </AdminLinkButton>
                    <AdminButton
                      className="min-h-9 px-3 py-1.5 text-xs"
                      type="button"
                      variant="danger"
                      disabled={!canDelete || isDeleting}
                      onClick={() => deleteProducts([product.slug], product.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </AdminButton>
                  </div>
                </article>
              );
            })
          )
        }
      />
    </div>
  );
}

function ProductFilters({
  filters,
  standTypes,
  businessUses,
  platforms,
  onChange
}: {
  filters: Filters;
  standTypes: StandType[];
  businessUses: BusinessUse[];
  platforms: PlatformDestination[];
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}) {
  return (
    <>
      <label className="relative block text-xs font-black uppercase text-muted">
        Search
        <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted" aria-hidden="true" />
        <AdminInput
          className="mt-2 py-2.5 pl-9 pr-3 font-normal"
          value={filters.search}
          placeholder="Name, SKU, slug"
          onChange={(event) => onChange("search", event.target.value)}
        />
      </label>
      <FilterSelect label="Stand Type" value={filters.standType} onChange={(value) => onChange("standType", value)}>
        {standTypes.map((standType) => (
          <option key={standType.slug} value={standType.slug}>
            {standType.title}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Business Use" value={filters.businessUse} onChange={(value) => onChange("businessUse", value)}>
        {businessUses.map((businessUse) => (
          <option key={businessUse.slug} value={businessUse.slug}>
            {businessUse.title}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Platform" value={filters.platform} onChange={(value) => onChange("platform", value)}>
        {platforms.map((platform) => (
          <option key={platform.slug} value={platform.slug}>
            {platform.title}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Status" value={filters.status} onChange={(value) => onChange("status", value)}>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </FilterSelect>
      <FilterSelect label="Asset readiness" value={filters.assetReadiness} onChange={(value) => onChange("assetReadiness", value)}>
        <option value="ready">Ready</option>
        <option value="draft_missing_assets">Missing</option>
        <option value="blocked">Blocked</option>
      </FilterSelect>
      <FilterSelect label="Special solution" value={filters.specialSolution} onChange={(value) => onChange("specialSolution", value)}>
        <option value="yes">Special solution</option>
        <option value="no">Normal product</option>
      </FilterSelect>
    </>
  );
}

function FilterSelect({
  label,
  value,
  children,
  onChange
}: {
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.04em] text-muted">
      {label}
      <AdminSelect
        className="mt-2 px-3 py-2.5 font-normal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {children}
      </AdminSelect>
    </label>
  );
}

function ProductThumbnail({ product }: { product: MigratedProduct }) {
  const image = product.images[0]?.src ?? product.assetSet?.standardAngledImageUrl ?? product.assetSet?.brandedAngledImageUrl;

  return image ? (
    <img src={image} alt={product.images[0]?.alt || product.title} className="h-16 w-16 rounded-lg border border-line bg-white object-contain" loading="lazy" />
  ) : (
    <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-line bg-white text-[10px] font-bold uppercase text-muted">
      No image
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "DIRECT" || status === "STANDARD"
      ? "success"
      : status === "archived" || status === "HOSTED"
        ? "neutral"
        : "warning";

  return <AdminBadge tone={tone}>{status}</AdminBadge>;
}

function StockBadge({ stockStatus }: { stockStatus: MigratedProduct["stockStatus"] }) {
  return (
    <AdminBadge tone={stockStatus === "instock" ? "success" : "neutral"}>
      {stockStatus === "instock" ? "In stock" : "Out of stock"}
    </AdminBadge>
  );
}

function ReadinessYesNoBadge({ ready }: { ready: boolean }) {
  return <AdminBadge tone={ready ? "success" : "warning"}>{ready ? "Yes" : "No"}</AdminBadge>;
}

function ProductMobileField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{label}</dt>
      <dd className={strong ? "font-semibold text-ink" : "text-muted"}>{value}</dd>
    </div>
  );
}

function getMediaWarnings(product: MigratedProduct) {
  const warnings = new Set<string>();
  const mainImage = product.images[0]?.src ?? "";
  const standardImage = product.assetSet?.standardAngledImageUrl ?? mainImage;
  const brandedImage = product.assetSet?.brandedAngledImageUrl ?? "";
  const brandedTemplate = product.assetSet?.brandedFrontTemplateUrl ?? "";
  const imageText = product.images.map((image) => `${image.src} ${image.alt}`).join(" ").toLowerCase();

  if (mainImage.includes("no-photo-available")) {
    warnings.add("placeholder main image");
  }

  if (mainImage.includes("/draft-product/")) {
    warnings.add("main image still uses draft media path");
  }

  if (brandedImage && standardImage && brandedImage === standardImage) {
    warnings.add("branded angled image matches standard image");
  }

  if (brandedTemplate.includes("/api/media/product/products/") && !brandedTemplate.includes(`/products/${product.slug}/`)) {
    warnings.add("front template reused from another product");
  }

  if (imageText.includes("temporary")) {
    warnings.add("temporary media label");
  }

  return Array.from(warnings);
}

function getProductKind(product: MigratedProduct): ProductKind {
  return product.productKind ?? inferProductKind(product);
}

function getProductStatus(product: MigratedProduct) {
  return product.status ?? (product.isActive ? "active" : "draft");
}

function findTitle(items: { slug: string; title: string }[], slug?: string) {
  return slug ? items.find((item) => item.slug === slug)?.title ?? slug : undefined;
}

function formatBusinessUses(product: MigratedProduct, businessUses: BusinessUse[]) {
  const slugs = product.businessUseSlugs ?? [];
  if (slugs.length === 0) return "-";

  const labels = slugs.map((slug) => findTitle(businessUses, slug)).filter(Boolean);
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

function formatPriceRange(options: ReturnType<typeof getDefaultOptionsForProductKind>, product: MigratedProduct) {
  if (options.length === 0) {
    return formatPrice(product.salePriceCents ?? product.basePriceCents);
  }

  if (options.length === 1) {
    const option = options[0];
    return option.monthlyPriceCents ? `${formatPrice(option.priceCents)} + ${formatPrice(option.monthlyPriceCents)}/mo` : formatPrice(option.priceCents);
  }

  const prices = options.map((option) => option.priceCents).sort((first, second) => first - second);
  return `${formatPrice(prices[0])}-${formatPrice(prices[prices.length - 1])}`;
}

function isProductListReady(status: string, brandedReadiness: BrandedTemplateReadiness, warnings: string[]) {
  return status === "ready" && brandedReadiness.status !== "missing" && warnings.length === 0;
}
