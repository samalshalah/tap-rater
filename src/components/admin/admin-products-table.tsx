"use client";
import { ProductFilters } from "./admin-products-table-fields";
import { createProductTableMetadataCache, getProductStatus } from "./admin-products-table-model";
import type { AdminProductsTableProps, DeleteStatus, Filters } from "./admin-products-table-types";

import type { MigratedProduct, ProductStatus } from "@/data/migrated-products";
import { SlidersHorizontal, Trash2 } from "lucide-react";
import {AdminProductCatalogView} from "./admin-product-catalog-view";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminAlert,
  AdminButton,
  AdminLinkButton
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

  const getMetadata = useMemo(() => createProductTableMetadataCache(), []);
  const productMetadata = useMemo(() => new Map(products.map(product => [product, getMetadata(product)])), [products, getMetadata]);

  const filteredProducts = useMemo(() => {
    const search = filters.search.toLowerCase();
    return products.filter((product) => {
      const {productStatus, assetStatus, searchText} = productMetadata.get(product)!;
      const businessUseSlugs = product.businessUseSlugs ?? [];

      return (
        (!filters.search || searchText.includes(search)) &&
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
      <AdminProductCatalogView filteredProducts={filteredProducts} productMetadata={productMetadata} selectedSlugs={selectedSlugs} savingStatusSlugs={savingStatusSlugs} isDeleting={isDeleting} allSelected={allSelected} toggleSelectAll={toggleSelectAll} toggleProduct={toggleProduct} updateProductStatus={updateProductStatus} deleteProducts={deleteProducts} standTypes={standTypes} businessUses={businessUses} canDelete={canDelete}/>
    </div>
  );
}
