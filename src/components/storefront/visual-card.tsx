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
  variant?: "story" | "type" | "use-case";
  density?: "editorial" | "compact";
};

export function VisualCard({ cta = "View options", density = "editorial", description, eyebrow, href, image, imageFit = "contain", title, variant = "story" }: VisualCardProps) {
  if (variant === "use-case") {
    return <UseCaseCard cta={cta} description={description} eyebrow={eyebrow} href={href} image={image} title={title} />;
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
      className="group flex h-full min-h-[442px] flex-col overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_16px_50px_rgba(16,32,30,0.06)] ring-1 ring-black/[0.05] transition hover:-translate-y-0.5 hover:shadow-[0_22px_64px_rgba(16,32,30,0.08)]"
    >
      <div className="relative min-h-[238px] w-full overflow-hidden rounded-[22px] bg-white">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          className="object-contain object-center p-3 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]"
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 90vw"
        />
      </div>
      <div className="flex flex-1 flex-col pt-6">
        <p className="text-[1.45rem] font-semibold leading-[1.12] text-[#101722] sm:text-[1.62rem]">{title}</p>
        <p className="mt-3 text-sm font-medium leading-6 text-[#5f6b78]">{description}</p>
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
      className={`group flex h-full flex-col overflow-hidden rounded-[34px] bg-[#fbfbfb] shadow-[0_22px_70px_rgba(16,32,30,0.08)] ring-1 ring-black/[0.035] transition hover:-translate-y-0.5 hover:shadow-[0_26px_82px_rgba(16,32,30,0.1)] ${compact ? "min-h-[520px]" : "min-h-[640px]"}`}
    >
      <div className={compact ? "px-7 pb-3 pt-8 sm:px-8 sm:pt-9" : "px-8 pb-4 pt-10 sm:px-11 sm:pt-12"}>
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className={`mt-4 font-semibold leading-[1.08] text-[#090b0f] ${compact ? "text-[1.65rem] sm:text-[1.95rem]" : "text-[1.95rem] sm:text-[2.35rem]"}`}>{title}</h3>
        <p className={`mt-4 max-w-[650px] font-normal leading-8 text-[#646a72] ${compact ? "text-base" : "text-lg"}`}>{description}</p>
        <span className={`tr-editorial-link ${compact ? "mt-5" : "mt-7"}`}>
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className={imageFit === "cover" ? `relative mt-auto bg-[#f7f8f8] ${compact ? "min-h-[300px]" : "min-h-[390px]"}` : `relative mt-auto bg-[#fbfbfb] ${compact ? "min-h-[300px]" : "min-h-[430px]"}`}>
        <Image src={image.src} alt={image.alt} fill unoptimized className={imageClassName} />
      </div>
    </Link>
  );
}

function UseCaseCard({ cta, description, eyebrow, href, image, title }: Pick<VisualCardProps, "cta" | "description" | "eyebrow" | "href" | "image" | "title"> & { cta: string }) {
  return (
    <Link href={href} className="group flex h-full min-h-[390px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_52px_rgba(16,32,30,0.07)] ring-1 ring-black/[0.035] transition hover:-translate-y-0.5 hover:shadow-[0_22px_64px_rgba(16,32,30,0.09)]">
      <div className="px-5 pb-4 pt-6 sm:px-6 sm:pt-7">
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className="mt-3 text-[1.35rem] font-semibold leading-[1.12] text-[#090b0f] sm:text-[1.55rem]">{title}</h3>
        <p className="mt-3 max-w-xl text-sm font-normal leading-6 text-[#646a72]">{description}</p>
        <span className="sr-only">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-auto min-h-[190px] overflow-hidden bg-white sm:min-h-[220px]">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.018]" />
      </div>
    </Link>
  );
}
