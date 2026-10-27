"use client";
import { ProductFilters, ProductMobileField, ProductStatusControl, ProductThumbnail, ReadinessYesNoBadge } from "./admin-products-table-fields";
import { buildProductTableMetadata, findTitle, formatBusinessUses, formatPriceRange, getProductStatus } from "./admin-products-table-model";
import type { AdminProductsTableProps, DeleteStatus, Filters } from "./admin-products-table-types";

import type { MigratedProduct, ProductStatus } from "@/data/migrated-products";
import { Edit3, ExternalLink, SlidersHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminAlert,
  AdminButton,
  AdminExternalButton,
  AdminIconButton,
  AdminLinkButton,
  AdminResponsiveTable
} from "./admin-ui";

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
  const [savingStatusSlugs, setSavingStatusSlugs] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<DeleteStatus>(null);

  useEffect(() => {
    setMobileFilters(filters);
  }, [filters]);

  const productMetadata = useMemo(() => new Map(products.map(product => [product, buildProductTableMetadata(product)])), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const {productStatus, assetStatus, searchText} = productMetadata.get(product)!;
      const businessUseSlugs = product.businessUseSlugs ?? [];

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
  }, [filters, products, productMetadata]);

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

  async function updateProductStatus(product: MigratedProduct, nextStatus: ProductStatus) {
    const currentStatus = getProductStatus(product);
    if (nextStatus === currentStatus || savingStatusSlugs.has(product.slug)) {
      return;
    }

    setSavingStatusSlugs((current) => new Set(current).add(product.slug));
    setStatus(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: product.slug, status: nextStatus })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; status?: ProductStatus; isActive?: boolean } | null;

      if (!response.ok || !payload?.status) {
        throw new Error(payload?.error ?? "Product status could not be saved.");
      }

      setProducts((current) =>
        current.map((item) =>
          item.slug === product.slug
            ? {
                ...item,
                status: payload.status,
                isActive: payload.isActive ?? payload.status === "active"
              }
            : item
        )
      );
      setStatus({ tone: "success", message: `${product.title} status changed to ${payload.status}.` });
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Product status could not be saved."
      });
    } finally {
      setSavingStatusSlugs((current) => {
        const next = new Set(current);
        next.delete(product.slug);
        return next;
      });
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
              <th className="px-4 py-3 w-[90px]">Sort</th>
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
              const {productKind, options, readiness, brandedReadiness, productReady} = productMetadata.get(product)!;

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
                  <td className="px-4 py-3 font-semibold text-ink">{product.sortOrder ?? 1000}</td>
                  <td className="px-4 py-3 text-muted">{findTitle(standTypes, product.standTypeSlug) ?? "-"}</td>
                  <td className="px-4 py-3 text-muted">{formatBusinessUses(product, businessUses)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatPriceRange(options, product)}</td>
                  <td className="px-4 py-3">
                    <ReadinessYesNoBadge ready={productReady} />
                  </td>
                  <td className="px-4 py-3">
                    <ProductStatusControl
                      status={getProductStatus(product)}
                      disabled={savingStatusSlugs.has(product.slug)}
                      onChange={(nextStatus) => updateProductStatus(product, nextStatus)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <AdminLinkButton className="min-h-9 px-3 py-1.5 text-xs" variant="outline" href={`/admin/products/${product.slug}`}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </AdminLinkButton>
                      <AdminExternalButton
                        aria-label={`View ${product.title} in store`}
                        title={`View ${product.title} in store`}
                        className="h-9 min-h-9 w-9 px-0 py-0"
                        variant="outline"
                        href={`/product/${product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </AdminExternalButton>
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
                <td className="p-10 text-center text-muted" colSpan={10}>
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
              const {productKind, options, readiness, brandedReadiness, productReady} = productMetadata.get(product)!;

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
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <ProductMobileField label="Type" value={findTitle(standTypes, product.standTypeSlug) ?? "-"} />
                    <ProductMobileField label="Sort" value={String(product.sortOrder ?? 1000)} strong />
                    <ProductMobileField label="Uses" value={formatBusinessUses(product, businessUses)} />
                    <ProductMobileField label="Price" value={formatPriceRange(options, product)} strong />
                    <ProductMobileField label="Readiness" value={productReady ? "Yes" : "No"} strong={productReady} />
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <ProductStatusControl
                      status={getProductStatus(product)}
                      disabled={savingStatusSlugs.has(product.slug)}
                      onChange={(nextStatus) => updateProductStatus(product, nextStatus)}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                    <AdminLinkButton className="min-h-9 px-3 py-1.5 text-xs" variant="outline" href={`/admin/products/${product.slug}`}>
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </AdminLinkButton>
                    <AdminExternalButton
                      aria-label={`View ${product.title} in store`}
                      title={`View ${product.title} in store`}
                      className="h-9 min-h-9 w-9 px-0 py-0"
                      variant="outline"
                      href={`/product/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </AdminExternalButton>
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
