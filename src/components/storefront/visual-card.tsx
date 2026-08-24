import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { StorefrontVisual } from "@/lib/storefront-visuals";

type VisualCardProps = {
  href: string;
  title: string;
  description: string;
  image: StorefrontVisual;
  eyebrow?: string;
  cta?: string;
  imageFit?: "contain" | "cover";
  variant?: "story" | "use-case";
  density?: "editorial" | "compact";
};

export function VisualCard({ cta = "View options", density = "editorial", description, eyebrow, href, image, imageFit = "contain", title, variant = "story" }: VisualCardProps) {
  if (variant === "use-case") {
    return <UseCaseCard cta={cta} description={description} eyebrow={eyebrow} href={href} image={image} title={title} />;
  }

  return <ProductStoryCard cta={cta} density={density} description={description} eyebrow={eyebrow} href={href} image={image} imageFit={imageFit} title={title} />;
}

function ProductStoryCard({
  cta,
  density,
  description,
  eyebrow,
  href,
  image,
  imageFit,
  title
}: Required<Pick<VisualCardProps, "cta" | "density" | "description" | "href" | "image" | "imageFit" | "title">> & Pick<VisualCardProps, "eyebrow">) {
  const compact = density === "compact";
  const imageClassName =
    imageFit === "cover"
      ? "object-cover transition duration-200 group-hover:scale-[1.03]"
      : "object-contain p-1 transition duration-200 scale-[1.14] group-hover:scale-[1.18]";

  return (
    <Link
      href={href}
      className={`tr-premium-surface group grid overflow-hidden bg-soft md:grid-cols-[0.9fr_1.1fr] ${compact ? "min-h-[320px]" : "min-h-[420px]"}`}
    >
      <div className={`flex flex-col justify-center ${compact ? "p-5 sm:p-6 lg:p-7" : "p-6 sm:p-8 lg:p-10"}`}>
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className={`mt-3 font-black leading-tight text-ink ${compact ? "text-2xl sm:text-3xl" : "text-[1.75rem] sm:text-4xl"}`}>{title}</h3>
        <p className={`mt-4 max-w-md leading-7 text-muted ${compact ? "text-sm" : "text-base"}`}>{description}</p>
        <span className={`tr-editorial-link ${compact ? "mt-5" : "mt-7"}`}>
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className={imageFit === "cover" ? `relative bg-soft md:min-h-full ${compact ? "min-h-[220px]" : "min-h-[260px]"}` : `relative bg-white md:min-h-full ${compact ? "min-h-[220px]" : "min-h-[280px]"}`}>
        <Image src={image.src} alt={image.alt} fill unoptimized className={imageClassName} />
      </div>
    </Link>
  );
}

function UseCaseCard({ cta, description, eyebrow, href, image, title }: Pick<VisualCardProps, "cta" | "description" | "eyebrow" | "href" | "image" | "title"> & { cta: string }) {
  return (
    <Link href={href} className="tr-premium-surface group flex h-full min-h-[460px] flex-col bg-white">
      <div className="p-6 pb-5 sm:p-8 sm:pb-6">
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className="mt-2 text-[1.7rem] font-black leading-tight text-ink sm:text-[2.1rem]">{title}</h3>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">{description}</p>
        <span className="tr-editorial-link mt-6">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-auto min-h-[250px] overflow-hidden rounded-t-[24px] bg-soft sm:min-h-[300px]">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-cover transition duration-200 group-hover:scale-[1.025]" />
      </div>
    </Link>
  );
}
