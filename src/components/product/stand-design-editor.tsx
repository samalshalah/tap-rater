"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Printer } from "lucide-react";
import { BrandedProofPreview, type BrandedProofProblem } from "./branded-proof-preview";
import { ProofControls } from "./proof-controls";
import { SetupPreviewFrame } from "./setup-preview-frame";

type EditorProps = ComponentProps<typeof BrandedProofPreview> & {
  controls: ComponentProps<typeof ProofControls>;
  placeholder?: ReactNode;
  disabled?: boolean;
};

// Same layout as the Multi-Link links step: controls on the left, the preview in the same
// 280px spot on the right where the phone page preview sits. On phones the stand comes first.
export function StandDesignEditor({controls, placeholder, disabled, ...preview}: EditorProps) {
  // Print problems (e.g. a logo too small to print sharply) show beside the controls, not under the stand.
  const [problem, setProblem] = useState<BrandedProofProblem | null>(null);
  return (
    <fieldset disabled={disabled} aria-label="Stand design controls"
      className="tr-stand-design-editor tr-prismatic-storefront text-base leading-normal m-0 grid w-full min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="order-2 min-w-0 lg:order-1">
        <ProofControls {...controls} problem={placeholder ? null : problem} />
      </div>
      <div className="order-1 min-w-0 lg:order-2">
        <SetupPreviewFrame label="Print preview" icon={<Printer size={13} aria-hidden="true" />}>
          <div className="grid h-full content-center">
            {placeholder ?? <BrandedProofPreview key={preview.productSlug} {...preview} onProblem={setProblem} />}
          </div>
        </SetupPreviewFrame>
      </div>
    </fieldset>
  );
}
