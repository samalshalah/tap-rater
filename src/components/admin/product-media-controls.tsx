"use client";
import { Copy,ExternalLink,Loader2,MoreHorizontal,Trash2,UploadCloud } from "lucide-react";
import { AdminAlert,AdminBadge } from "./admin-ui";
import type { MediaUploadRole } from "./product-editor-types";
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
