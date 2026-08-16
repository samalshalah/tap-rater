import Image from "next/image";
import Link from "next/link";
import type { StorefrontVisual } from "@/lib/storefront-visuals";

type VisualCardProps = {
  href: string;
  title: string;
  description: string;
  image: StorefrontVisual;
  eyebrow?: string;
  cta?: string;
  imageFit?: "contain" | "cover";
};

export function VisualCard({ cta = "View options", description, eyebrow, href, image, imageFit = "contain", title }: VisualCardProps) {
  const imageClassName =
    imageFit === "cover"
      ? "object-cover transition duration-200 group-hover:scale-[1.03]"
      : "object-contain p-4 transition duration-200 group-hover:scale-[1.03]";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-white transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_18px_42px_rgba(17,24,39,0.08)]"
    >
      <div className={imageFit === "cover" ? "relative h-44 bg-[#f7f8fa]" : "relative h-40 bg-white"}>
        <Image src={image.src} alt={image.alt} fill unoptimized className={imageClassName} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.08em] text-brand">{eyebrow}</p> : null}
        <h3 className="mt-1 text-lg font-black leading-snug text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <p className="mt-auto pt-4 text-sm font-black text-brand">{cta}</p>
      </div>
    </Link>
  );
}
