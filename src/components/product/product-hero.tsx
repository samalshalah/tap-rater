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

export function ProductHero({ product, category }: ProductHeroProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [selectedOptionId, setSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const effectiveSelectedOptionId = options.some((option) => option.id === selectedOptionId) ? selectedOptionId : options[0]?.id;

  return (
    <div className="tr-container grid gap-10 py-10 lg:grid-cols-[0.94fr_1fr] lg:items-start lg:py-16">
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
          <h1 className="text-[2.15rem] font-semibold leading-[1.08] text-[#111317] md:text-[2.65rem]">{product.title}</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-[#5f686f]">{product.shortDescription}</p>
        </div>

        <ProductSetupChooser product={product} selectedOptionId={effectiveSelectedOptionId} onSelectedOptionChange={setSelectedOptionId} />
      </div>
    </div>
  );
}
