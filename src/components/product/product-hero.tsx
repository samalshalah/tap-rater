"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogCategory, MigratedProduct } from "@/data/migrated-products";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductSetupChooser } from "@/components/product/product-setup-chooser";
import { getProductPurchaseOptions, type PurchaseOptionId } from "@/lib/purchase-options";

type ProductHeroProps = {
  product: MigratedProduct;
  category?: CatalogCategory;
  destination: string;
  fromPrice: string;
};

export function ProductHero({ product, category, fromPrice }: ProductHeroProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [selectedOptionId, setSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const effectiveSelectedOptionId = options.some((option) => option.id === selectedOptionId) ? selectedOptionId : options[0]?.id;

  return (
    <div className="tr-container grid gap-10 lg:grid-cols-[0.98fr_0.92fr] lg:items-start">
      <ProductGallery product={product} selectedOptionId={effectiveSelectedOptionId} />

      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
          <Link href="/shop" className="text-muted hover:text-brand">
            Shop
          </Link>
          {category ? (
            <>
              <span className="text-muted">/</span>
              <Link href={`/category/${category.slug}`} className="text-muted hover:text-brand">
                {category.title}
              </Link>
            </>
          ) : null}
        </div>

        <div>
          <p className="tr-eyebrow">{category?.title ?? "Tap Rater stand"}</p>
          <h1 className="tr-page-title mt-3 max-w-3xl">{product.title}</h1>
          <p className="tr-body mt-5 max-w-2xl text-[1.05rem]">{product.shortDescription}</p>
          <p className="mt-5 text-xl font-semibold text-ink">{fromPrice} <span className="text-sm font-medium text-muted">starting price</span></p>
        </div>

        <ProductSetupChooser product={product} selectedOptionId={effectiveSelectedOptionId} onSelectedOptionChange={setSelectedOptionId} />
      </div>
    </div>
  );
}
