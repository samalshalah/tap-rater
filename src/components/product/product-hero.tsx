"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { CatalogCategory, MigratedProduct } from "@/data/migrated-products";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductSetupChooser } from "@/components/product/product-setup-chooser";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions, type PurchaseOptionId } from "@/lib/purchase-options";

type ProductHeroProps = {
  product: MigratedProduct;
  category?: CatalogCategory;
  destination: string;
  fromPrice: string;
};

export function ProductHero({ product, category, destination, fromPrice }: ProductHeroProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [selectedOptionId, setSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const effectiveSelectedOptionId = options.some((option) => option.id === selectedOptionId) ? selectedOptionId : options[0]?.id;
  const selectedOption = options.find((option) => option.id === effectiveSelectedOptionId) ?? options[0];
  const selectedPrice = selectedOption ? formatPrice(selectedOption.priceCents).replace(".00", "") : fromPrice;
  const isBranded = selectedOption?.id === "branded_qr_direct";

  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:px-8 lg:py-8">
      <ProductGallery product={product} selectedOptionId={effectiveSelectedOptionId} />

      <div className="grid gap-4">
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

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.09em]">
            {category ? <span className="rounded-full bg-teal-50 px-3 py-1.5 text-brand">{category.title}</span> : null}
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-muted">{destination}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-muted">No monthly fee</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink md:text-[40px]">{product.title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">{product.shortDescription}</p>

          <div className="mt-5 grid gap-3 rounded-xl border border-line bg-[#f7f8fa] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Selected setup</p>
              <p className="mt-1 text-xl font-semibold text-ink">{selectedPrice}</p>
              {selectedOption ? <p className="mt-1 text-sm font-medium text-muted">{selectedOption.label}</p> : null}
            </div>
            <div className="grid gap-1 text-[13px] text-muted">
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                {isBranded ? "NFC + printed QR" : "NFC only"}
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                {isBranded ? "Logo and proof before cart" : "One direct destination link"}
              </p>
            </div>
          </div>
        </div>

        <ProductSetupChooser product={product} selectedOptionId={effectiveSelectedOptionId} onSelectedOptionChange={setSelectedOptionId} />
      </div>
    </div>
  );
}
