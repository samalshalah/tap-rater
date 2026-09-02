import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

export function PageHero({
  backLink,
  body,
  className,
  cta,
  eyebrow,
  image,
  title
}: {
  backLink?: { href: string; label: string };
  body?: ReactNode;
  className?: string;
  cta?: { href: string; label: string };
  eyebrow?: string;
  image?: {
    alt: string;
    fit?: "contain" | "cover";
    priority?: boolean;
    src: string;
  };
  title: ReactNode;
}) {
  const imageFit = image?.fit ?? "contain";

  return (
    <SectionShell spacing="hero" className={className}>
      <div className={cx("tr-container tr-page-hero", !image && "tr-page-hero-text-only")}>
        <div className="tr-page-hero-copy">
          {backLink ? (
            <Link href={backLink.href} className="tr-editorial-link mb-6">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLink.label}
            </Link>
          ) : null}
          {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
          <h1 className="tr-page-title mt-4 max-w-3xl">{title}</h1>
          {body ? <div className="tr-page-hero-body mt-5 max-w-2xl">{body}</div> : null}
          {cta ? (
            <Link href={cta.href} className="tr-editorial-link mt-7">
              {cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {image ? (
          <div className="tr-page-hero-media tr-premium-surface relative aspect-[4/3]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={image.priority}
              unoptimized
              className={cx(
                imageFit === "cover" ? "object-cover" : "object-contain p-7 sm:p-10",
                imageFit === "contain" && "mix-blend-multiply"
              )}
            />
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
