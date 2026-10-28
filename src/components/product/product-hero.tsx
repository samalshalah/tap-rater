"use client";

import { type OffersSettings } from "@/lib/offers";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogCategory, MigratedProduct } from "@/data/migrated-products";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductAnalyticsEvent } from "@/components/analytics/ecommerce-events";
import { ProductSetupChooser } from "@/components/product/product-setup-chooser";
import { getProductPurchaseOptions, type PurchaseOptionId } from "@/lib/purchase-options";
import { getCategoryHref } from "@/lib/category-routes";
import { getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultPurchasableProductSize } from "@/lib/product-model";
import type { ShippingSettingsInput } from "@/lib/validators";

type ProductHeroProps = {
  product: MigratedProduct;
  offers?: OffersSettings | null;
  category?: CatalogCategory;
  destination: string;
  fromPrice: string;
  initialOptionId?: PurchaseOptionId;
  introduction?: string;
  shipping?: ShippingSettingsInput;
};

export function ProductHero({ product, category, initialOptionId, offers, introduction, shipping }: ProductHeroProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const initialOption = options.find((option) => option.id === initialOptionId) ?? options[0];
  const [selectedOptionId, setSelectedOptionId] = useState<PurchaseOptionId>(initialOption?.id ?? "branded_qr_direct");
  const [selectedPriceCents, setSelectedPriceCents] = useState<number | null>(() => initialOption
    ? getConfiguredUnitPriceCents(product, initialOption, {
      sizeCode: getDefaultPurchasableProductSize(product)?.code,
      colorCode: getDefaultProductColor(product)?.code
    })
    : product.basePriceCents);
  const effectiveSelectedOptionId = options.some((option) => option.id === selectedOptionId) ? selectedOptionId : options[0]?.id;

  return (
    <div className="tr-product-hero tr-container grid gap-5 sm:gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
      {effectiveSelectedOptionId && selectedPriceCents !== null ? <ProductAnalyticsEvent item={{ item_id: product.slug, item_variant: effectiveSelectedOptionId, price: selectedPriceCents / 100, quantity: 1 }} /> : null}
      <ProductGallery product={product} selectedOptionId={effectiveSelectedOptionId} />

      <div className="grid gap-4 sm:gap-5">
        <div className="hidden flex-wrap items-center gap-2 text-[13px] font-medium md:flex">
          <Link href="/shop" className="text-muted hover:text-brand">
            Shop
          </Link>
          {category ? (
            <>
              <span className="text-muted">/</span>
              <Link href={getCategoryHref(category.slug)} className="text-muted hover:text-brand">
                {category.title}
              </Link>
            </>
          ) : null}
        </div>

        <div>
          <h1 className="tr-product-title mt-2 max-w-3xl text-ink">{product.title}</h1>
          <p className="tr-product-description tr-body mt-3 max-w-2xl text-base">{(introduction ?? product.shortDescription).split(/(?<=\.)\s+/)[0]}</p>
        </div>

        <ProductSetupChooser
          shipping={shipping}
          offers={offers}
          product={product}
          selectedOptionId={effectiveSelectedOptionId}
          onSelectedOptionChange={setSelectedOptionId}
          onSelectedPriceChange={setSelectedPriceCents}
        />
      </div>
    </div>
  );
}
