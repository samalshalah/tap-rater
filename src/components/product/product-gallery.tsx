"use client";

import { ResponsiveUpload } from "@/components/storefront/responsive-upload";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MigratedProduct } from "@/data/migrated-products";
import type { PurchaseOptionId } from "@/lib/purchase-options";
import { getGalleryImages } from "@/lib/product-gallery";
export { getGalleryImages } from "@/lib/product-gallery";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

export function ProductGallery({ product, selectedOptionId }: { product: MigratedProduct; selectedOptionId?: PurchaseOptionId }) {
  const [activeOptionId, setActiveOptionId] = useState<PurchaseOptionId | undefined>(selectedOptionId);
  const galleryImages = useMemo(() => getGalleryImages(product, activeOptionId), [product, activeOptionId]);
  const [activeImageSrc, setActiveImageSrc] = useState(galleryImages[0]?.src);
  const image = galleryImages.find((item) => item.src === activeImageSrc) ?? galleryImages[0];

  useEffect(() => {
    setActiveOptionId(selectedOptionId);
  }, [selectedOptionId]);

  useEffect(() => {
    setActiveImageSrc(galleryImages[0]?.src);
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
      <div className="tr-product-gallery-main tr-premium-surface relative mx-auto aspect-square w-full max-w-[292px] bg-white sm:max-w-[390px] md:max-w-[430px] lg:max-w-[500px]">
        <ResponsiveUpload
          src={image.src}
          fallbackWidth={1200}
          sizes="(max-width: 639px) 292px, (max-width: 767px) 390px, (max-width: 1023px) 430px, 500px"
          alt={image.alt}
          loading="eager"
          fetchPriority="high"
          className="object-contain"
        />
      </div>
      <p className="text-center text-sm font-semibold">{activeOptionId === "branded_qr_direct" ? "Custom design · Logo + name + QR" : activeOptionId === "hosted_multilink" ? "Multi-Link design" : "Standard design"}</p>
      {activeOptionId === "branded_qr_direct" && product.slug === "google-review-stand" ? <p className="text-center text-xs text-muted">Red text marks your customization areas. We replace it with your logo, business name and review QR code.</p> : null}
      <p className="tr-product-gallery-caption min-h-5 text-center text-xs text-muted">{image.caption ?? ""}</p>
      <a href={image.src} target="_blank" rel="noopener noreferrer" className="text-center text-sm text-brand underline">View full-size image</a>
      {galleryImages.length > 1 ? (
        <div className="mx-auto w-full max-w-[292px] overflow-x-auto sm:max-w-[390px] md:max-w-[430px] lg:max-w-[500px]">
          <div className="flex w-max min-w-full justify-center gap-2 p-1">
            {galleryImages.map((thumbnail) => (
              <button
                key={thumbnail.src}
                type="button"
                onClick={() => setActiveImageSrc(thumbnail.src)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-white ${
                  image.src === thumbnail.src ? "border-brand" : "border-line"
                }`}
                aria-label={`View ${thumbnail.alt}`}
                aria-pressed={image.src === thumbnail.src}
              >
                <Image src={optimizedUploadSrc(thumbnail.src, 160)} alt="" fill unoptimized className="object-contain p-1.5 mix-blend-multiply" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
