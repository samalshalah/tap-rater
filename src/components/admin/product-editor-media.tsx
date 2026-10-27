"use client";
import { MediaUploadCard,ProductMediaTile } from './product-media-controls';
export { MediaUploadCard,ProductMediaTile } from './product-media-controls';

import type {
ProductOption
} from "@/lib/catalog-architecture";
import { formatPrice } from "@/lib/products";
import { useState } from "react";
import { AdminBadge,AdminButton } from "./admin-ui";

import { NumberInput,OptionReadinessBadge,RulePill } from "./product-editor-fields";
import { getOptionDisplayMeta,getOptionMediaRequirements,optionSkuSuffix } from "./product-editor-model";
import type { AssetKey,AssetSetState,MediaItemState,MediaUploadRole } from "./product-editor-types";
export function ProductMediaGrid({
  title,
  mainImage,
  galleryImages,
  requiredMain,
  uploadingRoles,
  mediaErrors,
  onUploadMain,
  onUploadGallery,
  onReplaceMedia
}: {
  title: string;
  mainImage: MediaItemState;
  galleryImages: MediaItemState[];
  requiredMain: boolean;
  uploadingRoles: Record<string, boolean>;
  mediaErrors: Record<string, string>;
  onUploadMain: (file: File) => void | Promise<void>;
  onUploadGallery: (file: File, index?: number) => void | Promise<void>;
  onReplaceMedia: (mainImage: MediaItemState, galleryImages: MediaItemState[]) => void;
}) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const selectedCount = selectedKeys.length;
  const selectedGalleryIndexes = selectedKeys
    .filter((key) => key.startsWith("gallery-"))
    .map((key) => Number(key.replace("gallery-", "")))
    .filter((index) => Number.isInteger(index));
  const selectedGalleryIndex = selectedGalleryIndexes.length === 1 ? selectedGalleryIndexes[0] : undefined;
  const canSetAsMain = selectedCount === 1 && typeof selectedGalleryIndex === "number" && Boolean(galleryImages[selectedGalleryIndex]?.src);
  const filledGalleryCount = galleryImages.filter((image) => Boolean(image.src)).length;

  function isSelected(key: string) {
    return selectedKeys.includes(key);
  }

  function toggleSelected(key: string) {
    setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  function setSelectedGalleryAsMain() {
    if (!canSetAsMain || typeof selectedGalleryIndex !== "number") return;

    const selectedImage = galleryImages[selectedGalleryIndex];
    const nextGalleryImages = [...galleryImages];
    if (mainImage.src) {
      nextGalleryImages[selectedGalleryIndex] = { src: mainImage.src, alt: mainImage.alt || title };
    } else {
      nextGalleryImages.splice(selectedGalleryIndex, 1);
    }

    onReplaceMedia({ src: selectedImage.src, alt: selectedImage.alt || title }, nextGalleryImages.slice(0, 5));
    clearSelection();
  }

  function deleteSelectedMedia() {
    if (selectedCount === 0) return;

    const deleteMain = selectedKeys.includes("main");
    const selectedGallerySet = new Set(selectedGalleryIndexes);
    let nextGalleryImages = galleryImages.filter((_, index) => !selectedGallerySet.has(index));
    let nextMainImage = mainImage;

    if (deleteMain) {
      const promotedImage = nextGalleryImages[0];
      nextMainImage = promotedImage ? { src: promotedImage.src, alt: promotedImage.alt || title } : { src: "", alt: title };
      nextGalleryImages = promotedImage ? nextGalleryImages.slice(1) : nextGalleryImages;
    }

    onReplaceMedia(nextMainImage, nextGalleryImages.slice(0, 5));
    clearSelection();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-muted">
          <span className="font-bold text-ink">Main image:</span> {mainImage.src ? "Ready" : requiredMain ? "Missing" : "Optional"}
          <span className="mx-2 text-line">/</span>
          <span className="font-bold text-ink">Gallery:</span> {filledGalleryCount}/5
        </div>
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-[#f7f8fa] px-2 py-1.5 text-xs font-bold text-ink">
            <span>{selectedCount} selected</span>
            <AdminButton
              type="button"
              className="min-h-8 px-2 py-1 text-xs"
              variant="outline"
              disabled={!canSetAsMain}
              onClick={setSelectedGalleryAsMain}
            >
              Set as main
            </AdminButton>
            <AdminButton type="button" className="min-h-8 px-2 py-1 text-xs" variant="danger" onClick={deleteSelectedMedia}>
              Delete
            </AdminButton>
            <AdminButton type="button" className="min-h-8 px-2 py-1 text-xs" variant="outline" onClick={clearSelection}>
              Clear
            </AdminButton>
          </div>
        ) : null}
      </div>

      <div className="grid auto-rows-[120px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ProductMediaTile
          label="Main"
          value={mainImage.src}
          required={requiredMain}
          isMain
          isSelected={isSelected("main")}
          isUploading={Boolean(uploadingRoles.main)}
          error={mediaErrors.main}
          onToggleSelected={() => toggleSelected("main")}
          onUpload={onUploadMain}
        />
        {galleryImages.map((image, index) => (
          <ProductMediaTile
            key={`${image.src}-${index}`}
            label={`Gallery ${index + 1}`}
            value={image.src}
            isSelected={isSelected(`gallery-${index}`)}
            isUploading={Boolean(uploadingRoles.gallery)}
            error={mediaErrors.gallery}
            onToggleSelected={() => toggleSelected(`gallery-${index}`)}
            onUpload={(file) => onUploadGallery(file, index)}
          />
        ))}
        {galleryImages.length < 5 ? (
          <ProductMediaTile
            label="Add media"
            value=""
            isUploading={Boolean(uploadingRoles.gallery)}
            error={mediaErrors.gallery}
            onToggleSelected={() => undefined}
            onUpload={(file) => (mainImage.src ? onUploadGallery(file) : onUploadMain(file))}
          />
        ) : null}
      </div>

      <p className="rounded-md border border-line bg-[#f7f8fa] px-3 py-2 text-xs leading-5 text-muted">
        Stored URLs stay in product data but are hidden from the normal editor. Use the tile menu only when you need to view or copy a URL.
      </p>
      <input type="hidden" name="product-media-title" value={title} readOnly />
    </div>
  );
}

export function SetupOptionEditor({
  option,
  skuBase,
  assetSet,
  uploadingRoles,
  mediaErrors,
  onChange,
  onUploadAsset,
  onUpdateAsset
}: {
  option: ProductOption;
  skuBase: string;
  assetSet: AssetSetState;
  uploadingRoles: Record<string, boolean>;
  mediaErrors: Record<string, string>;
  onChange: (patch: Partial<ProductOption>) => void;
  onUploadAsset: (file: File, key: AssetKey, role: MediaUploadRole) => Promise<void>;
  onUpdateAsset: (key: AssetKey, value: string) => void;
}) {
  const mediaRequirements = getOptionMediaRequirements(option.optionCode, assetSet);
  const missingRequiredMedia = mediaRequirements.filter((requirement) => requirement.required && !requirement.value);
  const optionReady = !option.isActive || missingRequiredMedia.length === 0;
  const optionSku = `${skuBase || "PRODUCT"}-${optionSkuSuffix(option.optionCode)}`;
  const optionMeta = getOptionDisplayMeta(option);
  const optionPrice = option.monthlyPriceCents
    ? `${formatPrice(option.priceCents)} + ${formatPrice(option.monthlyPriceCents)}/mo`
    : formatPrice(option.priceCents);

  return (
    <details className="group rounded-md border border-line bg-white shadow-sm">
      <summary className="grid cursor-pointer list-none gap-3 p-3 md:grid-cols-[minmax(0,1fr)_140px_150px_120px] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{option.title}</h3>
            <AdminBadge tone="neutral">{optionMeta.badge}</AdminBadge>
            <OptionReadinessBadge ready={optionReady} missingCount={missingRequiredMedia.length} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{optionMeta.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-muted">
            <code className="rounded bg-[#f7f8fa] px-2 py-1">{option.optionCode}</code>
            <code className="rounded bg-[#f7f8fa] px-2 py-1">{optionSku}</code>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-muted">Price</p>
          <p className="mt-1 text-sm font-black text-ink">{optionPrice}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-muted">Media</p>
          <p className={optionReady ? "mt-1 text-sm font-black text-brand" : "mt-1 text-sm font-black text-red-700"}>
            {optionReady ? "Ready" : missingRequiredMedia.map((item) => item.label).join(", ")}
          </p>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm font-bold text-ink" onClick={(event) => event.stopPropagation()}>
          Enabled
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-brand"
            checked={option.isActive}
            onChange={(event) => onChange({ isActive: event.target.checked })}
          />
        </label>
      </summary>

      <div className="grid gap-4 border-t border-line bg-[#fbfbfc] p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <NumberInput label="Price cents" value={option.priceCents} onChange={(priceCents) => onChange({ priceCents })} />
        </div>

        {option.optionCode === "standard_direct" ? (
          <div className="rounded-md border border-line bg-white px-3 py-3 text-sm text-muted">
            <p className="font-bold text-ink">Standard Direct uses the main product image.</p>
            <p className="mt-1 text-xs leading-5">
              Upload or replace the first image in Product Media. Branded + QR uses separate branded media when that option is selected.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mediaRequirements.map((requirement) => (
              <MediaUploadCard
                key={`${option.optionCode}-${requirement.assetKey}`}
                label={requirement.label}
                description={requirement.description}
                value={requirement.value}
                required={requirement.required && option.isActive}
                role={requirement.role}
                size="compact"
                isUploading={Boolean(uploadingRoles[requirement.role])}
                error={mediaErrors[requirement.role]}
                onUpload={(file) => onUploadAsset(file, requirement.assetKey, requirement.role)}
                onRemove={() => onUpdateAsset(requirement.assetKey, "")}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <RulePill active={option.requiresDestinationUrl} label="Destination link" />
          <RulePill active={option.hasQr} label="Printed QR" />
          <RulePill active={option.requiresLogo} label="Logo" />
          <RulePill active={option.requiresBusinessName} label="Business name" />
          <RulePill active={option.requiresDesignStep} label="Design step" />
          <RulePill active={option.requiresFrontProof} label="Artwork review" />
          <RulePill active={option.accountRequired} label="Account" />
          <RulePill active={option.requiresSubscription} label="Subscription" />
        </div>
      </div>
    </details>
  );
}
