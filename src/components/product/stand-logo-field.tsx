"use client";

import { UploadCloud } from "lucide-react";

export function StandLogoField({filename, isUploadingLogo, onUpload}: {
  filename?: string;
  isUploadingLogo: boolean;
  onUpload: (file?: File) => Promise<void>;
}) {
  return (
    <div className="tr-panel-muted grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Business logo</p>
          <p className="mt-1 text-xs leading-5 text-muted">Choose a photo, vector logo, or design file up to 50 MB. For documents and animations, we use the first page or frame.</p>
        </div>
        {filename ? <span className="tr-pill-brand">Logo uploaded</span> : null}
      </div>
      <label className="grid min-h-32 cursor-pointer place-items-center rounded-lg border border-dashed border-line bg-white p-4 text-center text-sm font-medium text-muted transition hover:border-brand">
        <UploadCloud className="mb-2 h-6 w-6" />
        {isUploadingLogo ? "Uploading logo..." : filename ? filename : "Upload logo"}
        <span className="mt-1 block text-xs font-semibold text-brand">{filename ? "Click to replace" : "Choose file"}</span>
        <input
          className="sr-only"
          type="file"
          accept="image/*,.heic,.heif,.avif,.svg,.pdf,.ai,.eps,.ps,.psd,.psb,.tif,.tiff,.ico,.tga,.jp2,.j2k,.jxl,.pcx,.ppm,.pgm,.pbm,.dds"
          disabled={isUploadingLogo}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void onUpload(file);
          }}
        />
      </label>
    </div>
  );
}
