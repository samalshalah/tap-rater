import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type SectionTone = "white" | "soft";
type SectionSpacing = "hero" | "default" | "compact";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SectionShell({
  children,
  className,
  spacing = "default",
  tone = "white"
}: {
  children: ReactNode;
  className?: string;
  spacing?: SectionSpacing;
  tone?: SectionTone;
}) {
  return (
    <section
      className={cx(
        tone === "soft" ? "tr-section-shell-soft" : "tr-section-shell",
        spacing === "hero" && "tr-section-hero",
        spacing === "default" && "tr-section-default",
        spacing === "compact" && "tr-section-compact",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  align = "split",
  body,
  cta,
  eyebrow,
  title
}: {
  align?: "center" | "split" | "left";
  body?: string;
  cta?: { href: string; label: string };
  eyebrow?: string;
  title: string;
}) {
  const content = (
    <div className={cx(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-[820px]")}>
      {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
      <h2 className="tr-section-title mt-4">{title}</h2>
      {body ? <p className="tr-body mt-4 max-w-2xl">{body}</p> : null}
    </div>
  );

  if (align === "center" || !cta) {
    return content;
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      {content}
      <Link href={cta.href} className="tr-editorial-link shrink-0">
        {cta.label}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
