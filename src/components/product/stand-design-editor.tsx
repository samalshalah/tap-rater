"use client";

import type { ComponentProps, ReactNode } from "react";
import { BrandedProofPreview } from "./branded-proof-preview";
import { ProofControls } from "./proof-controls";

type EditorProps = ComponentProps<typeof BrandedProofPreview> & {
  controls: ComponentProps<typeof ProofControls>;
  placeholder?: ReactNode;
  disabled?: boolean;
};

export function StandDesignEditor({controls, placeholder, disabled, ...preview}: EditorProps) {
  return (
    <fieldset disabled={disabled} aria-label="Stand design controls"
      className="tr-stand-design-editor tr-prismatic-storefront text-base leading-normal m-0 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_144px] items-start gap-x-3 gap-y-4 border-0 p-0 md:grid-cols-[minmax(0,1fr)_260px] md:gap-6">
      {placeholder ?? <BrandedProofPreview key={preview.productSlug} {...preview} />}
      <ProofControls {...controls} />
    </fieldset>
  );
}
