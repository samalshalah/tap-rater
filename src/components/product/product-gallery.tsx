"use client";

import { GallerySlide } from "@/components/product/gallery-slide";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MigratedProduct } from "@/data/migrated-products";
import type { PurchaseOptionId } from "@/lib/purchase-options";
import { galleryImageKey, getGalleryImages } from "@/lib/product-gallery";
export { getGalleryImages } from "@/lib/product-gallery";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

export function ProductGallery({ product, selectedOptionId }: { product: MigratedProduct; selectedOptionId?: PurchaseOptionId }) {
  const [activeOptionId, setActiveOptionId] = useState<PurchaseOptionId | undefined>(selectedOptionId);
  const galleryImages = useMemo(() => getGalleryImages(product, activeOptionId), [product, activeOptionId]);
  const [activeImageKey, setActiveImageKey] = useState(galleryImages[0] ? galleryImageKey(galleryImages[0]) : undefined);
  const image = galleryImages.find((item) => galleryImageKey(item) === activeImageKey) ?? galleryImages[0];

  useEffect(() => {
    setActiveOptionId(selectedOptionId);
  }, [selectedOptionId]);

  useEffect(() => {
    setActiveImageKey(galleryImages[0] ? galleryImageKey(galleryImages[0]) : undefined);
  }, [galleryImages]);

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

  if (!image) return <p className="text-center text-sm text-muted">Personalized image preview coming soon. Your design proof is shown during setup.</p>;

  return (
    <div className="grid content-center gap-3 lg:sticky lg:top-24">
      <div style={image.panel ? { height: "auto", aspectRatio: "1 / 1" } : undefined} className="tr-product-gallery-main tr-premium-surface relative mx-auto aspect-square w-full max-w-[292px] bg-white sm:max-w-[390px] md:max-w-[430px] lg:max-w-[500px]">
        <GallerySlide image={image} />
      </div>
      {galleryImages.length > 1 ? (
        <div className="mx-auto w-full max-w-[292px] overflow-x-auto sm:max-w-[390px] md:max-w-[430px] lg:max-w-[500px]">
          <div className="flex w-max min-w-full justify-center gap-2 p-1">
            {galleryImages.map((thumbnail) => (
              <button
                key={galleryImageKey(thumbnail)}
                type="button"
                onClick={() => setActiveImageKey(galleryImageKey(thumbnail))}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-white ${
                  galleryImageKey(image) === galleryImageKey(thumbnail) ? "border-brand" : "border-line"
                }`}
                aria-label={`View ${thumbnail.alt}`}
                aria-pressed={galleryImageKey(image) === galleryImageKey(thumbnail)}
              >
                {thumbnail.panel ? <span className="flex h-full items-center justify-center break-words px-1 text-center text-[10px] font-semibold leading-tight text-ink">{thumbnail.label}</span> : <Image src={optimizedUploadSrc(thumbnail.src, 160)} alt="" fill unoptimized className="object-contain p-1 bg-white" />}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
