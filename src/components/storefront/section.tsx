import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getBusinessUseImagePosition } from "@/lib/storefront-visuals";
import { PrismaticWave } from "@/components/prismatic/motion";
import { ResponsiveUpload } from "./responsive-upload";
import styles from "./business-pages.module.css";

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
  cta,
  eyebrow,
  image,
  media,
  spacing = "hero",
  title,
  variant = "cinematic"
}: {
  backLink?: { href: string; label: string };
  body?: ReactNode;
  cta?: { href: string; label: string };
  eyebrow?: string;
  spacing?: SectionSpacing;
  media?: ReactNode;
  image?: {
    alt: string;
    caption?: string;
    fit?: "contain" | "cover";
    placement?: "right";
    priority?: boolean;
    src: string;
  };
  title: ReactNode;
  variant?: "cinematic" | "plain";
}) {
  const cinematic = variant === "cinematic";
  const hasMedia = Boolean(image || media);
  const fullPhoto = !media && image?.fit === "cover";

  return (
    <SectionShell spacing={spacing} className={cx(cinematic && styles.hero, spacing === "hero" && "tr-prismatic-page-intro")}>
      {spacing === "hero" ? <PrismaticWave variant="banner" /> : null}
      <div className={cx(
        "tr-container tr-page-hero",
        !hasMedia && "tr-page-hero-text-only",
        cinematic && styles.frame,
        cinematic && (fullPhoto ? styles.photo : hasMedia ? styles.split : styles.textOnly),
        cinematic && fullPhoto && image?.placement === "right" && styles.photoOnRight
      )}>
        <div className={cx("tr-page-hero-copy", cinematic && styles.copy)}>
          {backLink ? (
            <Link href={backLink.href} className={cx("tr-editorial-link mb-6", cinematic && styles.back)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLink.label}
            </Link>
          ) : null}
          {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
          <h1 className={cx("mt-4 max-w-3xl", cinematic ? styles.title : "tr-page-title")}>{title}</h1>
          {body ? <div className="tr-page-hero-body mt-5 max-w-2xl">{body}</div> : null}
          {cta ? (
            <Link href={cta.href} className={cx("tr-editorial-link mt-7", cinematic && styles.cta)}>
              {cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {hasMedia ? (
          <figure className={cx("w-full min-w-0 max-w-[520px] justify-self-center lg:justify-self-end", cinematic && styles.visual)}>
            {media ?? (image && (
              <div className={cx("tr-page-hero-media relative aspect-[4/3]", cinematic && styles.image)}>
                <ResponsiveUpload
                  src={image.src}
                  alt={image.alt}
                  sizes={fullPhoto && !image.placement ? "(min-width: 1440px) 1296px, 100vw" : "(min-width: 1024px) 55vw, 100vw"}
                  fallbackWidth={1200}
                  loading={image.priority ? "eager" : "lazy"}
                  fetchPriority={image.priority ? "high" : undefined}
                  style={fullPhoto ? { objectPosition: getBusinessUseImagePosition(image.src) } : undefined}
                  className={fullPhoto ? "object-cover" : "object-contain p-7 sm:p-10"}
                />
              </div>
            ))}
            {!media && image?.caption ? <figcaption className="px-4 py-2 text-center text-xs text-muted">{image.caption}</figcaption> : null}
          </figure>
        ) : null}
      </div>
    </SectionShell>
  );
}
