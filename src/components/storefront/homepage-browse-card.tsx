import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { VisualCard } from "@/components/storefront/visual-card";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import type { StorefrontVisual } from "@/lib/storefront-visuals";

type HomepageBrowseCardProps = {
  href: string;
  title: string;
  description: string;
  image: StorefrontVisual;
  variant: "type" | "use-case";
};

export function HomepageBrowseCard(props: HomepageBrowseCardProps) {
  return (
    <div className="min-w-0">
      <Link href={props.href} prefetch={false} className="group flex min-h-20 items-center gap-4 py-3 text-ink transition hover:text-brand lg:hidden">
        <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-white">
          <Image
            src={optimizedUploadSrc(props.image.src, 160)}
            alt=""
            fill
            unoptimized
            sizes="64px"
            className={props.variant === "type" ? "object-contain mix-blend-multiply" : "object-cover"}
          />
        </div>
        <span className="min-w-0 flex-1 text-base font-semibold [overflow-wrap:anywhere]">{props.title}</span>
        <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
      </Link>
      <div className="hidden h-full lg:block">
        <VisualCard {...props} cta="Learn more" />
      </div>
    </div>
  );
}
