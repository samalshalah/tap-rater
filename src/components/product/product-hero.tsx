"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogCategory, MigratedProduct } from "@/data/migrated-products";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductSetupChooser } from "@/components/product/product-setup-chooser";
import { getProductPurchaseOptions, type PurchaseOptionId } from "@/lib/purchase-options";
import { formatPrice } from "@/lib/products";

type ProductHeroProps = {
  product: MigratedProduct;
  category?: CatalogCategory;
  destination: string;
  fromPrice: string;
};

export function ProductHero({ product, category, fromPrice }: ProductHeroProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [selectedOptionId, setSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const [selectedPriceCents, setSelectedPriceCents] = useState<number | null>(options[0]?.priceCents ?? product.basePriceCents);
  const effectiveSelectedOptionId = options.some((option) => option.id === selectedOptionId) ? selectedOptionId : options[0]?.id;
  const displayPrice = selectedPriceCents === null ? fromPrice : formatPrice(selectedPriceCents).replace(".00", "");
  const pricePrefix = selectedPriceCents === null ? "From " : "";

  return (
    <div className="tr-container grid gap-5 sm:gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
      <ProductGallery product={product} selectedOptionId={effectiveSelectedOptionId} />

      <div className="grid gap-4 sm:gap-5">
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
          <h1 className="tr-product-title mt-2 max-w-3xl text-ink">{product.title}</h1>
          <p className="tr-body mt-3 max-w-2xl text-base">{product.shortDescription}</p>
          <p className="mt-3 text-xl font-semibold text-ink">{pricePrefix}{displayPrice}</p>
        </div>

        <ProductSetupChooser
          product={product}
          selectedOptionId={effectiveSelectedOptionId}
          onSelectedOptionChange={setSelectedOptionId}
          onSelectedPriceChange={setSelectedPriceCents}
        />
      </div>
    </div>
  );
}
