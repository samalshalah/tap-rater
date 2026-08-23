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
      className="tr-hover-card group flex h-full flex-col overflow-hidden"
    >
      <div className={imageFit === "cover" ? "relative h-44 bg-soft" : "relative h-40 bg-white"}>
        <Image src={image.src} alt={image.alt} fill unoptimized className={imageClassName} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        {eyebrow ? <p className="tr-eyebrow">{eyebrow}</p> : null}
        <h3 className="mt-1 text-lg font-black leading-snug text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <p className="mt-auto pt-4 text-sm font-black text-brand">{cta}</p>
      </div>
    </Link>
  );
}
