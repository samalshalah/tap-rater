import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import type { StorefrontVisual } from "@/lib/storefront-visuals";

type VisualCardProps = {
  href: string;
  title: string;
  description: string;
  image: StorefrontVisual;
  eyebrow?: string;
  cta?: string;
  imageFit?: "contain" | "cover";
  variant?: "story" | "type" | "use-case";
  density?: "editorial" | "compact";
};

export function VisualCard({ cta = "View options", density = "editorial", description, eyebrow, href, image, imageFit = "contain", title, variant = "story" }: VisualCardProps) {
  if (variant === "use-case") {
    return <UseCaseCard density={density} description={description} eyebrow={eyebrow} href={href} image={image} title={title} />;
  }

  if (variant === "type") {
    return <TypeCard cta={cta} description={description} href={href} image={image} title={title} />;
  }

  return <ProductStoryCard cta={cta} density={density} description={description} eyebrow={eyebrow} href={href} image={image} imageFit={imageFit} title={title} />;
}

function TypeCard({ cta, description, href, image, title }: Pick<VisualCardProps, "cta" | "description" | "href" | "image" | "title"> & { cta: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="tr-hover-card group flex aspect-[4/5] h-full min-h-[360px] flex-col overflow-hidden p-6"
    >
      <div className="relative min-h-0 flex-[1.1] w-full overflow-hidden rounded-[var(--tr-radius-card)] bg-white">
        <Image
          src={optimizedUploadSrc(image.src, 640)}
          alt={image.alt}
          fill
          unoptimized
          className="object-contain object-center p-3 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]"
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 90vw"
        />
      </div>
      <div className="flex min-h-0 flex-[0.95] flex-col pt-6">
        <p className="tr-card-title text-[1.2rem] sm:text-[1.34rem]">{title}</p>
        <p className="tr-body-sm mt-3">{description}</p>
        <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-brand">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
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
      ? "object-cover transition duration-300 group-hover:scale-[1.02]"
      : "object-contain p-4 transition duration-300 scale-[1.08] group-hover:scale-[1.11]";

  return (
    <Link
      href={href}
      prefetch={false}
      className={`tr-hover-card group flex h-full flex-col overflow-hidden ${compact ? "min-h-[520px]" : "min-h-[640px]"}`}
    >
      <div className={compact ? "px-7 pb-3 pt-8 sm:px-8 sm:pt-9" : "px-8 pb-4 pt-10 sm:px-11 sm:pt-12"}>
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className={`mt-4 font-semibold leading-[1.08] text-ink ${compact ? "text-[1.65rem] sm:text-[1.95rem]" : "text-[1.95rem] sm:text-[2.35rem]"}`}>{title}</h3>
        <p className={`tr-body mt-4 max-w-[650px] ${compact ? "text-base" : "text-lg"}`}>{description}</p>
        <span className={`tr-editorial-link ${compact ? "mt-5" : "mt-7"}`}>
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className={imageFit === "cover" ? `relative mt-auto bg-soft ${compact ? "min-h-[300px]" : "min-h-[390px]"}` : `relative mt-auto bg-white ${compact ? "min-h-[300px]" : "min-h-[430px]"}`}>
        <Image src={optimizedUploadSrc(image.src, 640)} alt={image.alt} fill unoptimized className={imageClassName} />
      </div>
    </Link>
  );
}

function UseCaseCard({ density, description, eyebrow, href, image, title }: Pick<VisualCardProps, "density" | "description" | "eyebrow" | "href" | "image" | "title">) {
  const compact = density === "compact";

  return (
    <Link href={href} prefetch={false} className={compact ? "tr-hover-card group flex h-full min-h-[300px] flex-col overflow-hidden sm:aspect-[4/5] sm:min-h-[360px]" : "tr-hover-card group flex aspect-[4/5] h-full min-h-[360px] flex-col overflow-hidden"}>
      <div className={compact ? "px-5 pb-4 pt-6 sm:min-h-0 sm:flex-[0.86] sm:px-6 sm:pt-7" : "min-h-0 flex-[0.86] px-5 pb-4 pt-6 sm:px-6 sm:pt-7"}>
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className="tr-card-title mt-3 text-[1.32rem] sm:text-[1.5rem]">{title}</h3>
        <p className="tr-body-sm mt-3 max-w-xl">{description}</p>
      </div>
      <div className={compact ? "relative mt-auto min-h-[160px] overflow-hidden bg-white sm:min-h-0 sm:flex-[1.14]" : "relative mt-auto min-h-0 flex-[1.14] overflow-hidden bg-white"}>
        <Image src={optimizedUploadSrc(image.src, 640)} alt={image.alt} fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.018]" />
      </div>
    </Link>
  );
}
