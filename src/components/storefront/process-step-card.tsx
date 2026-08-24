import type { LucideIcon } from "lucide-react";

export function ProcessStepCard({
  description,
  icon: Icon,
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
      {Icon ? (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className={Icon ? "mt-6 text-xs font-semibold uppercase text-accent" : "text-xs font-semibold uppercase text-accent"}>
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-tight text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
