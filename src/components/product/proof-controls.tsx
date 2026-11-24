"use client";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImageUp, Minus, Plus, RotateCcw } from "lucide-react";
import type { BrandedProofProblem } from "./branded-proof-preview";
import type { ReactNode } from "react";
import type { LogoBackgroundMode, LogoFitMode } from "./product-setup-types";

// Same small square buttons as the Multi-Link link rows, so both steps look alike.
const iconButton = "grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-white text-ink hover:border-brand hover:text-brand disabled:cursor-default disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink";
const positionStep = 2;
const positionLimit = 20;

function ControlRow({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-white px-2 py-1" title={hint}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}

function SizeStepper({ label, value, min, max, disabled = false, onChange }: {
  label: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className={iconButton} aria-label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 5))}>
        <Minus size={15} aria-hidden="true" />
      </button>
      <output aria-live="polite" className={`w-11 text-center text-sm font-semibold tabular-nums ${disabled ? "text-muted" : "text-ink"}`}>{value}%</output>
      <button type="button" className={iconButton} aria-label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 5))}>
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function Choice({ label, value, options, disabled = false, onChange }: {
  label: string; value: string; options: Array<{ label: string; value: string }>; disabled?: boolean; onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 rounded-md border px-2 text-xs font-semibold disabled:cursor-default disabled:opacity-45 ${value === option.value ? "border-ink bg-soft text-ink" : "border-line bg-white text-muted hover:border-ink hover:text-ink"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ProofControls({
  isUploadingLogo,
  canAutoCrop,
  logoBackgroundMode,
  logoFitMode,
  logoOffsetXPercent,
  logoOffsetYPercent,
  onLogoBackgroundModeChange,
  onLogoFitModeChange,
  onLogoOffsetXPercentChange,
  onLogoOffsetYPercentChange,
  onUploadLogo,
  onProofFontSizePercentChange,
  onProofLogoSizePercentChange,
  proofFontSizePercent,
  proofLogoSizePercent,
  showBusinessNameOnProof,
  header,
  footer,
  problem = null
}: {
  isUploadingLogo: boolean;
  canAutoCrop: boolean;
  logoBackgroundMode: LogoBackgroundMode;
  logoFitMode: LogoFitMode;
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  onLogoBackgroundModeChange: (value: LogoBackgroundMode) => void;
  onLogoFitModeChange: (value: LogoFitMode) => void;
  onLogoOffsetXPercentChange: (value: number) => void;
  onLogoOffsetYPercentChange: (value: number) => void;
  onUploadLogo: (file: File | undefined) => void;
  onProofFontSizePercentChange: (value: number) => void;
  onProofLogoSizePercentChange: (value: number) => void;
  proofFontSizePercent: number;
  proofLogoSizePercent: number;
  showBusinessNameOnProof: boolean;
  /** A print problem from the preview, shown under the controls. */
  problem?: BrandedProofProblem | null;
  /** Shown above the controls, e.g. the step heading. */
  header?: ReactNode;
  /** Shown at the bottom of the panel, e.g. the QR destination and the approval checkbox. */
  footer?: ReactNode;
}) {
  const nudge = (value: number, step: number) => Math.max(-positionLimit, Math.min(positionLimit, value + step));
  const centred = logoOffsetXPercent === 0 && logoOffsetYPercent === 0;
  return (
    <div className="grid min-w-0 content-start gap-1.5 sm:grid-cols-2" aria-label="Print design controls">
      {header ? <div className="sm:col-span-2">{header}</div> : null}

      <ControlRow label="Logo size">
        <SizeStepper label="Logo size" value={proofLogoSizePercent} min={50} max={250} onChange={onProofLogoSizePercentChange} />
      </ControlRow>

      <ControlRow label="Name size" hint={showBusinessNameOnProof ? undefined : "Business name isn’t printed."}>
        <SizeStepper label="Name size" value={proofFontSizePercent} min={50} max={160} disabled={!showBusinessNameOnProof} onChange={onProofFontSizePercentChange} />
      </ControlRow>

      <ControlRow label="Position">
        <div className="flex items-center gap-1">
          <button type="button" className={iconButton} aria-label="Move logo left" title="Move left" disabled={logoOffsetXPercent <= -positionLimit} onClick={() => onLogoOffsetXPercentChange(nudge(logoOffsetXPercent, -positionStep))}><ArrowLeft size={15} aria-hidden="true" /></button>
          <button type="button" className={iconButton} aria-label="Move logo right" title="Move right" disabled={logoOffsetXPercent >= positionLimit} onClick={() => onLogoOffsetXPercentChange(nudge(logoOffsetXPercent, positionStep))}><ArrowRight size={15} aria-hidden="true" /></button>
          <button type="button" className={iconButton} aria-label="Move logo up" title="Move up" disabled={logoOffsetYPercent <= -positionLimit} onClick={() => onLogoOffsetYPercentChange(nudge(logoOffsetYPercent, -positionStep))}><ArrowUp size={15} aria-hidden="true" /></button>
          <button type="button" className={iconButton} aria-label="Move logo down" title="Move down" disabled={logoOffsetYPercent >= positionLimit} onClick={() => onLogoOffsetYPercentChange(nudge(logoOffsetYPercent, positionStep))}><ArrowDown size={15} aria-hidden="true" /></button>
          <button type="button" className={iconButton} aria-label="Center the logo" title="Center the logo" disabled={centred} onClick={() => { onLogoOffsetXPercentChange(0); onLogoOffsetYPercentChange(0); }}><RotateCcw size={15} aria-hidden="true" /></button>
        </div>
      </ControlRow>

      <ControlRow label="Logo fit">
        <Choice label="Logo fit" value={logoFitMode} options={[{ label: "Fit", value: "contain" }, { label: "Fill", value: "fill" }]} onChange={(value) => onLogoFitModeChange(value as LogoFitMode)} />
      </ControlRow>

      <ControlRow label="Background" hint={canAutoCrop ? "Auto-crop removes the white around your logo." : "Your logo has no background to remove."}>
        <Choice label="Logo background" value={logoBackgroundMode} disabled={!canAutoCrop} options={[{ label: "Auto-crop", value: "auto_crop" }, { label: "Original", value: "original" }]} onChange={(value) => onLogoBackgroundModeChange(value as LogoBackgroundMode)} />
      </ControlRow>

      <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-2 text-sm font-semibold text-brand hover:border-brand" title="Best results: transparent PNG, 1200 px wide or larger.">
        <ImageUp size={16} aria-hidden="true" />
        {isUploadingLogo ? "Uploading…" : "Replace logo"}
        <input
          className="sr-only"
          type="file"
          accept="image/*,.heic,.heif,.avif,.svg,.pdf,.ai,.eps,.ps,.psd,.psb,.tif,.tiff,.ico,.tga,.jp2,.j2k,.jxl,.pcx,.ppm,.pgm,.pbm,.dds"
          disabled={isUploadingLogo}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            onUploadLogo(file);
          }}
        />
      </label>

      {problem ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800 sm:col-span-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">{problem.message}</p>
          <button type="button" className="shrink-0 text-xs font-semibold text-red-800 underline" onClick={problem.retry}>Retry</button>
        </div>
      ) : null}
      {footer ? <div className="sm:col-span-2">{footer}</div> : null}
    </div>
  );
}
