"use client";
import { RotateCcw, ImageUp, Minus, Plus, ChevronDown } from "lucide-react";
import type { UploadedLogo, LogoBackgroundMode, LogoFitMode } from "./product-setup-types";

export function ProofSizeControl({ label, value, min, max, disabled = false, onChange }: {
  label: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void;
}) {
  return <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-line bg-[#f6f8ff] p-2 md:p-4">
    <legend className="sr-only">{label}</legend>
    <p className="text-center text-xs font-bold text-ink md:text-sm">{label}</p>
    <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center rounded-lg border border-line bg-white">
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 5))}
        className="grid h-11 w-11 place-items-center rounded-l-lg text-brand hover:bg-soft disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite" className="text-center text-[11px] font-bold tabular-nums text-ink md:text-sm">{value}%</output>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 5))}
        className="grid h-11 w-11 place-items-center rounded-r-lg text-brand hover:bg-soft disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
    {disabled ? <p className="mt-2 text-center text-xs text-muted">Business name hidden</p> : null}
  </fieldset>;
}

function ProofRangeControl({
  label,
  max,
  min,
  onChange,
  unit = "%",
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  unit?: string;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-xs font-bold text-muted">{value}{unit}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 w-full accent-brand"
      />
    </label>
  );
}

export function ProofControls({
  isUploadingLogo,
  logo,
  logoBackgroundMode,
  logoFitMode,
  logoOffsetXPercent,
  logoOffsetYPercent,
  onLogoBackgroundModeChange,
  onLogoFitModeChange,
  onLogoOffsetXPercentChange,
  onLogoOffsetYPercentChange,
  onShowBusinessNameOnProofChange,
  onUploadLogo,
  onProofFontSizePercentChange,
  onProofLogoSizePercentChange,
  proofFontSizePercent,
  proofLogoSizePercent,
  showBusinessNameOnProof
}: {
  isUploadingLogo: boolean;
  logo: UploadedLogo;
  logoBackgroundMode: LogoBackgroundMode;
  logoFitMode: LogoFitMode;
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  onLogoBackgroundModeChange: (value: LogoBackgroundMode) => void;
  onLogoFitModeChange: (value: LogoFitMode) => void;
  onLogoOffsetXPercentChange: (value: number) => void;
  onLogoOffsetYPercentChange: (value: number) => void;
  onShowBusinessNameOnProofChange: (value: boolean) => void;
  onUploadLogo: (file: File | undefined) => void;
  onProofFontSizePercentChange: (value: number) => void;
  onProofLogoSizePercentChange: (value: number) => void;
  proofFontSizePercent: number;
  proofLogoSizePercent: number;
  showBusinessNameOnProof: boolean;
}) {
  return (
    <>
    <div className="grid min-w-0 self-center gap-3 md:gap-4">
      <ProofSizeControl label="Logo size" value={proofLogoSizePercent} min={75} max={160} onChange={onProofLogoSizePercentChange} />
      <ProofSizeControl label="Text size" value={proofFontSizePercent} min={75} max={135} disabled={!showBusinessNameOnProof} onChange={onProofFontSizePercentChange} />
      <p className="text-center text-[11px] leading-4 text-muted md:text-xs">Adjust in 5% steps.</p>
    </div>
    <details className="group col-span-2 min-w-0 rounded-xl border border-line bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        More design options <ChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 border-t border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-sm font-black text-ink">Logo</p>
          <p className="mt-1 text-xs leading-5 text-muted">Recommended: transparent PNG, 1200 px wide or larger.</p>
        </div>
        <label className="tr-button-outline w-full cursor-pointer sm:w-fit">
          <ImageUp size={16} />
          {isUploadingLogo ? "Uploading..." : "Replace logo"}
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isUploadingLogo}
            onChange={(event) => onUploadLogo(event.target.files?.[0])}
          />
        </label>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold text-ink">
        <input
          className="mt-1 h-4 w-4 accent-brand"
          type="checkbox"
          checked={showBusinessNameOnProof}
          onChange={(event) => onShowBusinessNameOnProofChange(event.target.checked)}
        />
        <span>
          Show business name text on the stand
          <span className="mt-1 block text-xs font-medium leading-5 text-muted">
            Turn off when the uploaded logo already includes the business name.
          </span>
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <ProofSegmentedControl
          label="Logo background"
          value={logoBackgroundMode}
          options={[
            { label: "Auto-crop", value: "auto_crop" },
            { label: "Original", value: "original" }
          ]}
          disabled={!logo.trimApplied}
          onChange={(value) => onLogoBackgroundModeChange(value as LogoBackgroundMode)}
        />
        <ProofSegmentedControl
          label="Logo fit"
          value={logoFitMode}
          options={[
            { label: "Fit", value: "contain" },
            { label: "Fill", value: "fill" }
          ]}
          onChange={(value) => onLogoFitModeChange(value as LogoFitMode)}
        />
      </div>
      {logo.trimApplied ? (
        <p className="text-xs font-semibold text-brand">Auto-crop prepared the logo and removed white background where possible. Original is still available.</p>
      ) : null}
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Logo position</p>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-ink hover:bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="Reset logo to centered position"
            title="Reset logo to centered position"
            onClick={() => { onLogoOffsetXPercentChange(0); onLogoOffsetYPercentChange(0); }}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
        <ProofRangeControl
          label="Logo left / right"
          value={logoOffsetXPercent}
          min={-20}
          max={20}
          unit=""
          onChange={onLogoOffsetXPercentChange}
        />
        <ProofRangeControl
          label="Logo up / down"
          value={logoOffsetYPercent}
          min={-20}
          max={20}
          unit=""
          onChange={onLogoOffsetYPercentChange}
        />
      </div>
      </div>
    </details>
    </>
  );
}

function ProofSegmentedControl({
  disabled = false,
  label,
  onChange,
  options,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className={disabled ? "grid gap-2 text-sm font-semibold text-muted opacity-60" : "grid gap-2 text-sm font-semibold text-ink"}>
      <p>{label}</p>
      <div className="grid grid-cols-2 rounded-lg border border-line bg-soft p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? "rounded-md bg-white px-3 py-2 text-xs font-black text-ink shadow-sm"
                : "rounded-md px-3 py-2 text-xs font-black text-muted hover:text-ink disabled:hover:text-muted"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

