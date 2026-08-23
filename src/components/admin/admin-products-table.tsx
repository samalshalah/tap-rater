"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Search, Trash2 } from "lucide-react";
import type { MigratedProduct, ProductKind } from "@/data/migrated-products";
import type { BusinessUse, PlatformDestination, StandType } from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind, getProductAssetReadiness, inferProductKind } from "@/lib/catalog-architecture";
import { getBrandedProductionTemplateReadiness, type BrandedTemplateReadiness } from "@/lib/admin-product-readiness";
import { getCanonicalProductModel } from "@/lib/product-model";
import { formatPrice } from "@/lib/products";

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
  destinationMode: string;
};

const defaultFilters: Filters = {
  search: "",
  standType: "",
  businessUse: "",
  platform: "",
  status: "",
  assetReadiness: "",
  specialSolution: "",
  destinationMode: ""
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
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<DeleteStatus>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const productStatus = getProductStatus(product);
      const productKind = getProductKind(product);
      const model = getCanonicalProductModel(product);
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
          (filters.specialSolution === "yes" ? product.isSpecialSolution === true : product.isSpecialSolution !== true)) &&
        (!filters.destinationMode || model.destinationMode === filters.destinationMode)
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
        <Link className="mt-6 inline-flex rounded-md bg-ink px-5 py-3 text-sm font-bold text-white" href="/admin/products/new">
          Add product
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-line bg-white shadow-sm">
      <div className="grid gap-3 border-b border-line p-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <label className="relative block text-xs font-black uppercase text-muted">
          Search
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted" aria-hidden="true" />
          <input
            className="mt-2 w-full rounded-md border border-line bg-white py-2.5 pl-9 pr-3 text-sm font-normal text-ink"
            value={filters.search}
            placeholder="Name, SKU, slug"
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </label>
        <FilterSelect label="Stand Type" value={filters.standType} onChange={(value) => updateFilter("standType", value)}>
          {standTypes.map((standType) => (
            <option key={standType.slug} value={standType.slug}>
              {standType.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Business Use" value={filters.businessUse} onChange={(value) => updateFilter("businessUse", value)}>
          {businessUses.map((businessUse) => (
            <option key={businessUse.slug} value={businessUse.slug}>
              {businessUse.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Platform" value={filters.platform} onChange={(value) => updateFilter("platform", value)}>
          {platforms.map((platform) => (
            <option key={platform.slug} value={platform.slug}>
              {platform.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </FilterSelect>
        <FilterSelect label="Asset readiness" value={filters.assetReadiness} onChange={(value) => updateFilter("assetReadiness", value)}>
          <option value="ready">Ready</option>
          <option value="draft_missing_assets">Missing</option>
          <option value="blocked">Blocked</option>
        </FilterSelect>
        <FilterSelect label="Special solution" value={filters.specialSolution} onChange={(value) => updateFilter("specialSolution", value)}>
          <option value="yes">Special solution</option>
          <option value="no">Normal product</option>
        </FilterSelect>
        <FilterSelect label="Destination mode" value={filters.destinationMode} onChange={(value) => updateFilter("destinationMode", value)}>
          <option value="DIRECT">DIRECT</option>
          <option value="HOSTED">HOSTED</option>
        </FilterSelect>
      </div>

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted">
          Showing <span className="font-bold text-ink">{filteredProducts.length}</span> of{" "}
          <span className="font-bold text-ink">{products.length}</span> products.
          {selectedSlugs.size > 0 ? <span> {selectedSlugs.size} selected.</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink" onClick={resetFilters}>
            Reset filters
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canDelete || selectedSlugs.size === 0 || isDeleting}
            onClick={() => deleteProducts([...selectedSlugs], selectedProductTitles.slice(0, 2).join(", "))}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete selected
          </button>
        </div>
      </div>
      {status ? (
        <div
          className={
            status.tone === "success"
              ? "border-b border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-brand"
              : "border-b border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          }
        >
          {status.message}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-[#f7f8fa] text-xs uppercase text-muted">
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-brand"
                  checked={allSelected}
                  disabled={filteredProducts.length === 0 || isDeleting}
                  aria-label="Select all filtered products"
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-4">Thumbnail</th>
              <th className="p-4">Product name</th>
              <th className="p-4">Stand Type</th>
              <th className="p-4">Business Uses</th>
              <th className="p-4">Destination</th>
              <th className="p-4">Customization</th>
              <th className="p-4">Available Options</th>
              <th className="p-4">Price Range</th>
              <th className="p-4">Production Template</th>
              <th className="p-4">Assets Ready</th>
              <th className="p-4">Status</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const productKind = getProductKind(product);
              const options = getDefaultOptionsForProductKind(productKind).filter((option) => option.isActive);
              const readiness = getProductAssetReadiness(product, options);
              const model = getCanonicalProductModel(product);
              const brandedReadiness = getBrandedProductionTemplateReadiness(product, options);

              return (
                <tr
                  className={
                    selectedSlugs.has(product.slug)
                      ? "border-b border-line bg-teal-50/40 last:border-b-0"
                      : "border-b border-line hover:bg-gray-50/70 last:border-b-0"
                  }
                  key={product.slug}
                >
                  <td className="p-4 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line accent-brand"
                      checked={selectedSlugs.has(product.slug)}
                      disabled={isDeleting}
                      aria-label={`Select ${product.title}`}
                      onChange={() => toggleProduct(product.slug)}
                    />
                  </td>
                  <td className="p-4">
                    <ProductThumbnail product={product} />
                  </td>
                  <td className="p-4">
                    <Link className="block font-black text-ink hover:text-brand" href={`/admin/products/${product.slug}`}>
                      {product.title}
                    </Link>
                    <span className="mt-1 block text-xs text-muted">{product.sku || product.slug}</span>
                  </td>
                  <td className="p-4 text-muted">{findTitle(standTypes, product.standTypeSlug) ?? "-"}</td>
                  <td className="p-4 text-muted">{formatBusinessUses(product, businessUses)}</td>
                  <td className="p-4 text-muted">
                    <StatusBadge status={model.destinationMode} />
                    <span className="mt-2 block font-semibold text-ink">{findTitle(platforms, product.primaryPlatformSlug) ?? "Manual URL"}</span>
                    <span className="text-xs">{product.destinationType ?? "custom"}</span>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={model.customizationLevel} />
                  </td>
                  <td className="p-4 text-muted">{options.map((option) => option.title).join(", ") || "-"}</td>
                  <td className="p-4 font-black text-ink">{formatPriceRange(options, product)}</td>
                  <td className="p-4">
                    <TemplateReadinessBadge readiness={brandedReadiness} />
                  </td>
                  <td className="p-4">
                    <ReadinessBadge status={readiness.status} missing={readiness.missing} />
                    <MediaWarningList warnings={getMediaWarnings(product)} />
                  </td>
                  <td className="p-4">
                    <StatusBadge status={getProductStatus(product)} />
                  </td>
                  <td className="p-4">
                    <StockBadge stockStatus={product.stockStatus} />
                  </td>
                  <td className="p-4 text-muted">{formatDate(product.updatedAt)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-bold text-ink hover:border-brand hover:text-brand"
                        href={`/admin/products/${product.slug}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="rounded-md border border-red-100 p-2 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canDelete || isDeleting}
                        aria-label={`Delete ${product.title}`}
                        title={`Delete ${product.title}`}
                        onClick={() => deleteProducts([product.slug], product.title)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 ? (
              <tr>
                <td className="p-10 text-center text-muted" colSpan={15}>
                  No products match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
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
    <label className="block text-xs font-black uppercase text-muted">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {children}
      </select>
    </label>
  );
}

function ProductThumbnail({ product }: { product: MigratedProduct }) {
  const image = product.images[0]?.src ?? product.assetSet?.standardAngledImageUrl ?? product.assetSet?.brandedAngledImageUrl;

  return image ? (
    <img src={image} alt={product.images[0]?.alt || product.title} className="h-14 w-14 rounded-md border border-line bg-white object-contain" loading="lazy" />
  ) : (
    <div className="grid h-14 w-14 place-items-center rounded-md border border-dashed border-line bg-white text-[10px] font-bold uppercase text-muted">
      No image
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "active" || status === "DIRECT" || status === "STANDARD"
      ? "bg-teal-50 text-brand"
      : status === "archived" || status === "HOSTED"
        ? "bg-gray-100 text-muted"
        : "bg-amber-50 text-ink";

  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${classes}`}>{status}</span>;
}

function TemplateReadinessBadge({ readiness }: { readiness: BrandedTemplateReadiness }) {
  if (readiness.status === "not_offered") {
    return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-muted">Branded not offered</span>;
  }

  if (readiness.status === "ready") {
    return <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand">Ready</span>;
  }

  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase text-red-700" title={readiness.reason}>
      Missing - branded unavailable
    </span>
  );
}

function StockBadge({ stockStatus }: { stockStatus: MigratedProduct["stockStatus"] }) {
  return (
    <span
      className={
        stockStatus === "instock"
          ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand"
          : "rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-muted"
      }
    >
      {stockStatus === "instock" ? "In stock" : "Out of stock"}
    </span>
  );
}

function ReadinessBadge({ status, missing }: { status: string; missing: string[] }) {
  if (status === "ready") {
    return <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand">Ready</span>;
  }

  const label =
    missing.length === 1
      ? `Missing ${shortMissingLabel(missing[0])}`
      : missing.length > 1
        ? `${missing.length} option assets missing`
        : "Blocked";

  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase text-red-700" title={missing.join(", ")}>
      {label}
    </span>
  );
}

function MediaWarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <ul className="mt-2 grid gap-1 text-[11px] leading-4 text-amber-700">
      {warnings.map((warning) => (
        <li key={warning}>Warning: {warning}</li>
      ))}
    </ul>
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

  if (brandedTemplate.includes("/products/") && !brandedTemplate.includes(`/products/${product.slug}/`)) {
    warnings.add("front template reused from another product");
  }

  if (imageText.includes("temporary")) {
    warnings.add("temporary media label");
  }

  return Array.from(warnings);
}

function shortMissingLabel(value: string) {
  return value
    .replace("Standard Direct angled image", "standard image")
    .replace("Branded + QR angled image", "branded image")
    .replace("Branded + QR front template", "branded template")
    .replace("Multi-Link angled image", "multi-link image")
    .replace("Multi-Link front template", "multi-link template")
    .replace("Landing page preview configuration", "landing preview")
    .toLowerCase();
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

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
