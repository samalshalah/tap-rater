import Link from "next/link";
import { googleReviewStandGuides } from "@/lib/google-review-stand-guides";
import { businessGuides, businessGuideHref } from "@/data/business-guides";

/** How-to guides first; the business-type guides show from tablet width up (phones see the 3 how-to guides). */
export function GoogleReviewStandGuideLinks() {
  return (
    <nav aria-label="Google review setup and placement guides" className="mt-6">
      <p className="tr-body-sm">Find the right spot for your stand and set up the review link for your location.</p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {businessGuides.filter((guide) => guide.category === "Google reviews").map((guide) => (
          <li key={guide.slug}>
            <Link href={businessGuideHref(guide)} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">{guide.seoTitle}</Link>
          </li>
        ))}
        {googleReviewStandGuides.map(({ href, label }) => (
          <li key={href} className="hidden sm:list-item">
            <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
