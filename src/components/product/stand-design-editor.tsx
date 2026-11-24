"use client";

import type { ComponentProps, ReactNode } from "react";
import { Printer } from "lucide-react";
import { BrandedProofPreview } from "./branded-proof-preview";
import { ProofControls } from "./proof-controls";

type EditorProps = ComponentProps<typeof BrandedProofPreview> & {
  controls: ComponentProps<typeof ProofControls>;
  placeholder?: ReactNode;
  disabled?: boolean;
};

// The printed stand on the left, every print control in one panel on the right (below it on phones).
export function StandDesignEditor({controls, placeholder, disabled, ...preview}: EditorProps) {
  return (
    <fieldset disabled={disabled} aria-label="Stand design controls"
      className="tr-stand-design-editor tr-prismatic-storefront text-base leading-normal m-0 grid w-full min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 border-0 p-0 md:grid-cols-[minmax(0,1fr)_300px] md:gap-6">
      <div className="relative grid min-w-0 content-start gap-2 rounded-lg border border-line bg-soft p-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink">
          <Printer size={13} aria-hidden="true" />
          Print preview
        </span>
        {placeholder ?? <BrandedProofPreview key={preview.productSlug} {...preview} />}
      </div>
      <ProofControls {...controls} />
    </fieldset>
  );
}
