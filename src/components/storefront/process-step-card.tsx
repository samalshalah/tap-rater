import type { LucideIcon } from "lucide-react";

export function ProcessStepCard({
  compactOnMobile = false,
  description,
  index,
  title
}: {
  compactOnMobile?: boolean;
  description: string;
  icon?: LucideIcon;
  index: number;
  title: string;
}) {
  return (
    <article className={compactOnMobile ? "grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 border-b border-line py-4 last:border-b-0 md:tr-process-step-card md:block md:last:border-b" : "tr-process-step-card"}>
      <p className={`text-xs font-semibold uppercase text-accent ${compactOnMobile ? "row-span-2" : ""}`}>
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className={compactOnMobile ? "text-lg font-semibold leading-snug text-ink md:mt-3 md:max-w-[18rem] md:text-[1.45rem] md:leading-[1.12]" : "mt-3 max-w-[18rem] text-[1.35rem] font-semibold leading-[1.12] text-ink sm:text-[1.45rem]"}>{title}</h3>
      <p className={compactOnMobile ? "col-start-2 mt-2 text-[0.95rem] leading-6 text-muted md:mt-4 md:leading-7" : "mt-4 text-[0.95rem] leading-7 text-muted"}>{description}</p>
    </article>
  );
}
