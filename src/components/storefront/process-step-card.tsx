import type { LucideIcon } from "lucide-react";

export function ProcessStepCard({
  description,
  index,
  title
}: {
  description: string;
  icon?: LucideIcon;
  index: number;
  title: string;
}) {
  return (
    <article className="tr-process-step-card">
      <p className="text-xs font-semibold uppercase text-accent">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-3 max-w-[18rem] text-[1.35rem] font-semibold leading-[1.12] text-ink sm:text-[1.45rem]">{title}</h3>
      <p className="mt-4 text-[0.95rem] leading-7 text-muted">{description}</p>
    </article>
  );
}
