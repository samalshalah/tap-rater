import type { ReactNode } from "react";

/**
 * The preview box on the right of the Links and Print steps. Both steps use this one frame so
 * the preview keeps the same place, size and look, and its fixed height fits the setup popup
 * without scrolling.
 */
export function SetupPreviewFrame({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[448px] w-full max-w-[280px] overflow-hidden rounded-2xl border border-line bg-soft p-2 lg:sticky lg:top-0">
      <span className="absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink shadow-sm">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}
