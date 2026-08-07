"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MigratedProduct } from "@/data/migrated-products";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import Link from "next/link";

type ProductManagementTableProps = {
  products: MigratedProduct[];
  canSave: boolean;
};

type ProductPatch = Partial<Pick<MigratedProduct, "stockStatus" | "isActive" | "featured">>;

export function ProductManagementTable({ products, canSave }: ProductManagementTableProps) {
  const router = useRouter();
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveQuickEdit(product: MigratedProduct, patch: ProductPatch) {
    if (!canSave) {
      setError("Database persistence is not configured yet.");
      return;
    }

    setSavingSlug(product.slug);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductSavePayload(product, patch))
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "Product update failed.");
      }

      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Product update failed.");
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <div className="grid gap-3">
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
      <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
        <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
              <th className="p-3">Product</th>
              <th className="p-3">Use</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Visibility</th>
              <th className="p-3">Featured</th>
              <th className="p-3">Edit</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const image = product.images[0];
              const disabled = !canSave || savingSlug === product.slug;

              return (
                <tr className="border-b border-line last:border-b-0" key={product.slug}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-gray-50">
                        {image ? <img src={image.src} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] font-black uppercase text-muted">No image</span>}
                      </div>
                      <div>
                        <p className="font-black text-ink">{product.title}</p>
                        <p className="mt-1 text-xs text-muted">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted">{getCategoryBySlug(product.categorySlug)?.title ?? product.categorySlug}</td>
                  <td className="p-3 text-muted">
                    <span className="font-bold text-ink">{formatPrice(product.salePriceCents ?? product.basePriceCents)}</span>
                    {product.salePriceCents ? <span className="ml-2 text-xs line-through">{formatPrice(product.basePriceCents)}</span> : null}
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded-md border border-line bg-white px-2 py-2 text-xs font-bold text-ink disabled:bg-gray-100"
                      value={product.stockStatus}
                      disabled={disabled}
                      onChange={(event) => saveQuickEdit(product, { stockStatus: event.target.value as MigratedProduct["stockStatus"] })}
                    >
                      <option value="instock">In stock</option>
                      <option value="outofstock">Out of stock</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded-md border border-line bg-white px-2 py-2 text-xs font-bold text-ink disabled:bg-gray-100"
                      value={product.isActive ? "true" : "false"}
                      disabled={disabled}
                      onChange={(event) => saveQuickEdit(product, { isActive: event.target.value === "true" })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Draft</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded-md border border-line bg-white px-2 py-2 text-xs font-bold text-ink disabled:bg-gray-100"
                      value={product.featured ? "true" : "false"}
                      disabled={disabled}
                      onChange={(event) => saveQuickEdit(product, { featured: event.target.value === "true" })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <Link className="font-bold text-brand" href={`/admin/products/${product.slug}`}>
                      Edit
                    </Link>
                    {savingSlug === product.slug ? <p className="mt-1 text-xs font-semibold text-muted">Saving...</p> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildProductSavePayload(product: MigratedProduct, patch: ProductPatch) {
  const nextProduct = { ...product, ...patch };

  return {
    slug: nextProduct.slug,
    title: nextProduct.title,
    sku: nextProduct.sku,
    categorySlug: nextProduct.categorySlug,
    basePriceCents: nextProduct.basePriceCents,
    salePriceCents: nextProduct.salePriceCents,
    stockStatus: nextProduct.stockStatus,
    shortDescription: nextProduct.shortDescription,
    description: nextProduct.description,
    productType: nextProduct.productType,
    serviceMode: nextProduct.serviceMode,
    checkoutMode: nextProduct.checkoutMode,
    requiresAccount: nextProduct.requiresAccount,
    requiresSubscription: nextProduct.requiresSubscription,
    requiresLandingPage: nextProduct.requiresLandingPage,
    supportedDestinations: nextProduct.supportedDestinations,
    activationType: nextProduct.activationType,
    includedServiceLabel: nextProduct.includedServiceLabel,
    customizationOptions: nextProduct.customizationOptions,
    allowsLogoUpload: nextProduct.allowsLogoUpload,
    allowsCustomDesign: nextProduct.allowsCustomDesign,
    designMode: nextProduct.designMode,
    featured: nextProduct.featured ?? false,
    images: nextProduct.images,
    variants: nextProduct.variants,
    seoTitle: nextProduct.seoTitle,
    seoDescription: nextProduct.seoDescription,
    isActive: nextProduct.isActive
  };
}
