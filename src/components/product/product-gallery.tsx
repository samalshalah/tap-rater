"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MigratedProduct } from "@/data/migrated-products";
import type { PurchaseOptionId } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

type GalleryImage = { src: string; alt: string; caption?: string };

export function ProductGallery({ product, selectedOptionId }: { product: MigratedProduct; selectedOptionId?: PurchaseOptionId }) {
  const [activeOptionId, setActiveOptionId] = useState<PurchaseOptionId | undefined>(selectedOptionId);
  const optionImage = getSelectedGalleryImage(product, activeOptionId);
  const galleryImages = useMemo(() => getGalleryImages(product), [product]);
  const [activeImageSrc, setActiveImageSrc] = useState(optionImage.src);
  const image = galleryImages.find((item) => item.src === activeImageSrc) ?? optionImage;

  useEffect(() => {
    setActiveOptionId(selectedOptionId);
  }, [selectedOptionId]);

  useEffect(() => {
    setActiveImageSrc(optionImage.src);
  }, [optionImage.src]);

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
    <div className="grid content-center gap-3 lg:sticky lg:top-24">
      <div className="tr-premium-surface relative mx-auto aspect-[4/3.6] w-full max-w-[292px] bg-white sm:max-w-[390px] md:max-w-[430px] lg:max-w-[500px]">
        <Image
          src={optimizedUploadSrc(image.src, 1200)}
          alt={image.alt}
          fill
          priority
          fetchPriority="high"
          unoptimized
          className="object-contain p-4 mix-blend-multiply sm:p-6"
        />
      </div>
      <p className="min-h-5 text-center text-xs text-muted">{image.caption ?? ""}</p>
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

export function getGalleryImages(product: MigratedProduct): GalleryImage[] {
  const templates = new Set([
    product.assetSet?.standardFrontTemplateUrl,
    product.assetSet?.brandedFrontTemplateUrl,
    product.assetSet?.multiLinkFrontTemplateUrl
  ].filter(Boolean));
  const images: Array<GalleryImage | undefined> = [
    getProductVisual(product),
    product.assetSet?.brandedAngledImageUrl
      ? { src: product.assetSet.brandedAngledImageUrl, alt: `${product.title} Branded + QR layout example`, caption: "Branded + QR layout example" }
      : undefined,
    ...product.images.filter(item => !templates.has(item.src))
      .map((item, index) => ({ ...item, alt: item.alt.trim() || `${product.title} gallery view ${index + 1}` }))
  ];

  const seen = new Set<string>();
  return images.filter((item): item is GalleryImage => {
    if (!item?.src || templates.has(item.src) || seen.has(item.src)) {
      return false;
    }
    seen.add(item.src);
    return true;
  });
}

function getSelectedGalleryImage(product: MigratedProduct, selectedOptionId: PurchaseOptionId | undefined): GalleryImage {
  if (selectedOptionId === "branded_qr_direct" && product.assetSet?.brandedAngledImageUrl) {
    return {
      src: product.assetSet.brandedAngledImageUrl,
      alt: `${product.title} Branded + QR layout example`,
      caption: "Branded + QR layout example"
    };
  }

  if (selectedOptionId === "hosted_multilink" && (product.assetSet?.multiLinkAngledImageUrl ?? product.assetSet?.brandedAngledImageUrl)) {
    return {
      src: product.assetSet.multiLinkAngledImageUrl ?? product.assetSet.brandedAngledImageUrl ?? "",
      alt: `${product.title} hosted Multi-Link layout example`,
      caption: "Hosted Multi-Link layout example"
    };
  }

  return getProductVisual(product);
}
