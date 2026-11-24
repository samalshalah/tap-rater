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

// Same layout as the Multi-Link links step: controls on the left, the preview in the same
// 280px spot on the right where the phone page preview sits. On phones the stand comes first.
export function StandDesignEditor({controls, placeholder, disabled, ...preview}: EditorProps) {
  return (
    <fieldset disabled={disabled} aria-label="Stand design controls"
      className="tr-stand-design-editor tr-prismatic-storefront text-base leading-normal m-0 grid w-full min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="order-2 min-w-0 lg:order-1">
        <ProofControls {...controls} />
      </div>
      <div className="order-1 mx-auto grid w-full max-w-[280px] content-start gap-2 rounded-2xl border border-line bg-soft p-2 lg:sticky lg:top-0 lg:order-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink">
          <Printer size={13} aria-hidden="true" />
          Print preview
        </span>
        {placeholder ?? <BrandedProofPreview key={preview.productSlug} {...preview} />}
      </div>
    </fieldset>
  );
}
