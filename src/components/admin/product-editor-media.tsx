"use client";

import type {
ProductOption
} from "@/lib/catalog-architecture";
import { formatPrice } from "@/lib/products";
import { Copy,ExternalLink,Loader2,MoreHorizontal,Trash2,UploadCloud } from "lucide-react";
import { useState } from "react";
import { AdminAlert,AdminBadge,AdminButton } from "./admin-ui";

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

export function ProductMediaTile({
  label,
  value,
  isMain = false,
  required = false,
  isSelected = false,
  isUploading,
  error,
  onToggleSelected,
  onUpload
}: {
  label: string;
  value: string;
  isMain?: boolean;
  required?: boolean;
  isSelected?: boolean;
  isUploading: boolean;
  error?: string;
  onToggleSelected: () => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const ready = Boolean(value);

  function handleFile(file?: File) {
    if (file) {
      void onUpload(file);
    }
  }

  return (
    <div
      className={`group relative ${isMain ? "col-span-2 row-span-2" : ""} overflow-hidden rounded-lg border bg-white ${
        isSelected ? "border-brand ring-2 ring-brand/20" : "border-line"
      }`}
    >
      {ready ? (
        <button
          type="button"
          className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md border border-line bg-white/95 shadow-sm"
          aria-label={`${isSelected ? "Unselect" : "Select"} ${label}`}
          onClick={onToggleSelected}
        >
          <input className="pointer-events-none h-3.5 w-3.5 accent-brand" type="checkbox" checked={isSelected} readOnly />
        </button>
      ) : null}

      {ready ? (
        <details className="absolute right-2 top-2 z-10">
          <summary className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-md border border-line bg-white/95 text-muted shadow-sm hover:text-ink">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid w-40 gap-1 rounded-md border border-line bg-white p-2 text-xs font-bold shadow-lg">
            <a className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-ink hover:bg-[#f7f8fa]" href={value} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View image
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-left text-ink hover:bg-[#f7f8fa]"
              onClick={() => {
                void navigator.clipboard?.writeText(value);
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy URL
            </button>
          </div>
        </details>
      ) : null}

      <label
        className={`grid h-full min-h-0 cursor-pointer place-items-center bg-[#fbfbfc] p-2 text-center ${ready ? "" : "border border-dashed border-transparent hover:border-brand"}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {ready ? (
          <img src={value} alt="" className="h-full max-h-full w-full object-contain" loading="lazy" />
        ) : (
          <span className="grid justify-items-center gap-2 px-2 text-xs font-bold text-muted">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" /> : <UploadCloud className="h-5 w-5 text-muted group-hover:text-brand" aria-hidden="true" />}
            <span>{isMain ? "Add main image" : "Add media"}</span>
            <span className="text-[11px] font-normal">PNG, JPG, WEBP</span>
          </span>
        )}
      </label>

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/95 px-2 py-1 text-[11px] font-black text-ink shadow-sm">{label}</span>
        <span className={ready ? "rounded-full bg-teal-50 px-2 py-1 text-[11px] font-black text-brand shadow-sm" : "rounded-full bg-white/95 px-2 py-1 text-[11px] font-black text-muted shadow-sm"}>
          {ready ? "Ready" : required ? "Missing" : "Optional"}
        </span>
      </div>
      {error ? <p className="absolute bottom-10 left-2 right-2 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">{error}</p> : null}
      <input type="hidden" name={`product-media-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} value={value} readOnly />
    </div>
  );
}

export function MediaUploadCard({
  label,
  description,
  value,
  role,
  isUploading,
  error,
  required = false,
  size = "regular",
  secondaryAction,
  onUpload,
  onRemove
}: {
  label: string;
  description: string;
  value: string;
  role: MediaUploadRole;
  isUploading: boolean;
  error?: string;
  required?: boolean;
  size?: "hero" | "regular" | "thumbnail" | "compact";
  secondaryAction?: { label: string; onClick: () => void };
  onUpload: (file: File) => void | Promise<void>;
  onRemove: () => void;
}) {
  const ready = Boolean(value);
  const tileHeight = size === "hero" ? "h-52" : size === "thumbnail" ? "h-36" : size === "compact" ? "h-32" : "h-40";

  function handleFile(file?: File) {
    if (file) {
      void onUpload(file);
    }
  }

  return (
    <div className="grid gap-2 rounded-md border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">{label}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <AdminBadge tone={ready ? "success" : required ? "danger" : "neutral"}>
            {ready ? "Ready" : required ? "Missing" : "Optional"}
          </AdminBadge>
          {ready ? (
            <details className="relative">
              <summary className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-md border border-line text-muted hover:text-ink">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 grid w-40 gap-1 rounded-md border border-line bg-white p-2 text-xs font-bold shadow-lg">
                {secondaryAction ? (
                  <button
                    type="button"
                    className="rounded px-2 py-1.5 text-left text-ink hover:bg-[#f7f8fa]"
                    onClick={secondaryAction.onClick}
                  >
                    {secondaryAction.label}
                  </button>
                ) : null}
                <a className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-ink hover:bg-[#f7f8fa]" href={value} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  View image
                </a>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-left text-ink hover:bg-[#f7f8fa]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(value);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy URL
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (window.confirm(`Clear ${label}?`)) {
                      onRemove();
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear
                </button>
              </div>
            </details>
          ) : null}
        </div>
      </div>
      <label
        className={`group grid ${tileHeight} cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-line bg-[#fbfbfc] p-2 text-center hover:border-brand`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {ready ? (
          <img src={value} alt="" className="h-full max-h-full w-full object-contain" loading="lazy" />
        ) : (
          <span className="grid justify-items-center gap-2 text-xs font-bold text-muted">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" /> : <UploadCloud className="h-5 w-5 text-muted group-hover:text-brand" aria-hidden="true" />}
            Add image
            <span className="font-normal">PNG, JPG, WEBP up to 10 MB</span>
          </span>
        )}
      </label>
      {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
      {isUploading && ready ? <p className="text-xs font-bold text-brand">Uploading replacement...</p> : null}
      <input type="hidden" name={`media-${role}`} value={value} readOnly />
    </div>
  );
}

