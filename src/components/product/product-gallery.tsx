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
      <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-white lg:max-h-[620px]">
        <Image src={image.src} alt={image.alt} fill priority unoptimized className="object-contain" />
      </div>
      <div className="mt-3 grid gap-2 text-center text-[10px] font-bold uppercase tracking-[0.04em] text-muted sm:grid-cols-3 sm:text-[11px]">
        {activeOptionId === "branded_qr_direct" ? (
          <>
            <div className="min-w-0 rounded-lg bg-soft px-2 py-2 sm:px-3">NFC</div>
            <div className="min-w-0 rounded-lg bg-soft px-2 py-2 sm:px-3">Printed QR</div>
            <div className="min-w-0 rounded-lg bg-soft px-2 py-2 sm:px-3">Proof</div>
          </>
        ) : (
          <>
            <div className="min-w-0 rounded-lg bg-soft px-2 py-2 sm:px-3">QR + NFC direct</div>
            <div className="min-w-0 rounded-lg bg-soft px-2 py-2 sm:px-3">Ready-made stand</div>
            <div className="min-w-0 rounded-lg bg-soft px-2 py-2 sm:px-3">Direct link</div>
          </>
        )}
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
