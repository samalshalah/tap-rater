"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { MigratedProduct } from "@/data/migrated-products";
import type { PurchaseOptionId } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";

export function ProductGallery({ product, selectedOptionId }: { product: MigratedProduct; selectedOptionId?: PurchaseOptionId }) {
  const [activeOptionId, setActiveOptionId] = useState<PurchaseOptionId | undefined>(selectedOptionId);
  const image = getSelectedGalleryImage(product, activeOptionId);

  useEffect(() => {
    setActiveOptionId(selectedOptionId);
  }, [selectedOptionId]);

  useEffect(() => {
    function updateGallery(event: Event) {
      const detail = (event as CustomEvent<{ productSlug?: string; optionId?: PurchaseOptionId }>).detail;

      if (detail?.productSlug === product.slug) {
        setActiveOptionId(detail.optionId);
      }
    }

    window.addEventListener("taprater:product-option-change", updateGallery);
    return () => window.removeEventListener("taprater:product-option-change", updateGallery);
  }, [product.slug]);

  return (
    <div className="lg:sticky lg:top-24">
      <div className="relative aspect-[1.04] overflow-hidden rounded-[18px] border border-line bg-white">
        <Image src={image.src} alt={image.alt} fill priority unoptimized className="object-contain p-5 sm:p-7" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-[0.06em] text-muted">
        <div className="rounded-full border border-line bg-white px-3 py-2">NFC</div>
        <div className="rounded-full border border-line bg-white px-3 py-2">QR</div>
        <div className="rounded-full border border-line bg-white px-3 py-2">Proof</div>
      </div>
    </div>
  );
}

function getSelectedGalleryImage(product: MigratedProduct, selectedOptionId: PurchaseOptionId | undefined) {
  if (selectedOptionId === "branded_qr_direct" && product.assetSet?.brandedAngledImageUrl) {
    return {
      src: product.assetSet.brandedAngledImageUrl,
      alt: `${product.title} branded option`
    };
  }

  if (selectedOptionId === "hosted_multilink" && (product.assetSet?.multiLinkAngledImageUrl ?? product.assetSet?.brandedAngledImageUrl)) {
    return {
      src: product.assetSet.multiLinkAngledImageUrl ?? product.assetSet.brandedAngledImageUrl ?? "",
      alt: `${product.title} hosted multi-link option`
    };
  }

  return getProductVisual(product);
}
