"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { MigratedProduct } from "@/data/migrated-products";
import { formatPrice, getCategoryBySlug } from "@/lib/products";

type AdminProductsTableProps = {
  products: MigratedProduct[];
  canDelete: boolean;
};

type DeleteStatus = {
  tone: "success" | "error";
  message: string;
} | null;

export function AdminProductsTable({ products: initialProducts, canDelete }: AdminProductsTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<DeleteStatus>(null);
  const allSelected = products.length > 0 && selectedSlugs.size === products.length;
  const selectedProductTitles = useMemo(
    () => products.filter((product) => selectedSlugs.has(product.slug)).map((product) => product.title),
    [products, selectedSlugs]
  );

  function toggleSelectAll() {
    setStatus(null);
    setSelectedSlugs(allSelected ? new Set() : new Set(products.map((product) => product.slug)));
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
    const confirmation = slugs.length === 1 ? `Delete ${label}? This cannot be undone.` : `Delete ${slugs.length} selected products? This cannot be undone.`;
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

  return (
    <div className="mt-6 rounded-md border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted">
          <span className="font-bold text-ink">{products.length}</span> products
          {selectedSlugs.size > 0 ? <span> · {selectedSlugs.size} selected</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-brand"
              checked={allSelected}
              disabled={products.length === 0 || isDeleting}
              onChange={toggleSelectAll}
            />
            Select all
          </label>
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
        <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-brand"
                  checked={allSelected}
                  disabled={products.length === 0 || isDeleting}
                  aria-label="Select all products"
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-4">Image</th>
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4">Base price</th>
              <th className="p-4">Sale price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Visibility</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr className={selectedSlugs.has(product.slug) ? "border-b border-line bg-teal-50/40 last:border-b-0" : "border-b border-line last:border-b-0"} key={product.slug}>
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
                <td className="p-4 font-bold text-ink">
                  <Link className="hover:text-brand" href={`/admin/products/${product.slug}`}>
                    {product.title}
                  </Link>
                </td>
                <td className="p-4 text-muted">{product.sku}</td>
                <td className="p-4 text-muted">{getCategoryBySlug(product.categorySlug)?.title ?? product.categorySlug}</td>
                <td className="p-4 text-muted">{formatPrice(product.basePriceCents)}</td>
                <td className="p-4 text-muted">{product.salePriceCents ? formatPrice(product.salePriceCents) : "-"}</td>
                <td className="p-4">
                  <span className={product.stockStatus === "instock" ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-muted"}>
                    {product.stockStatus === "instock" ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td className="p-4">
                  <span className={product.isActive ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-ink"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-3">
                    <Link className="font-bold text-brand" href={`/admin/products/${product.slug}`}>
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
            ))}
            {products.length === 0 ? (
              <tr>
                <td className="p-8 text-center text-muted" colSpan={10}>
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductThumbnail({ product }: { product: MigratedProduct }) {
  const image = product.images[0];
  const thumbnailSrc =
    image?.src === "/uploads/products/business-google-white-stand.jpg"
      ? "/uploads/products/business-google-white-stands-bundle.jpg"
      : image?.src;

  return thumbnailSrc ? (
    <img src={thumbnailSrc} alt={image?.alt || product.title} className="h-14 w-14 rounded-md border border-line bg-white object-contain" loading="lazy" />
  ) : (
    <div className="grid h-14 w-14 place-items-center rounded-md border border-dashed border-line bg-white text-[10px] font-bold uppercase text-muted">
      No image
    </div>
  );
}
