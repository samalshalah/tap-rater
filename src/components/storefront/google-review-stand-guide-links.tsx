import Link from "next/link";
import { googleReviewStandGuides } from "@/lib/google-review-stand-guides";
import { businessGuides, businessGuideHref } from "@/data/business-guides";

export function GoogleReviewStandGuideLinks() {
  return (
    <nav aria-label="Google review setup and placement guides" className="mt-6">
      <p className="tr-body-sm">Find the right spot for your stand and set up the review link for your location.</p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {googleReviewStandGuides.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">{label}</Link>
          </li>
        ))}
        {businessGuides.filter((guide) => guide.category === "Google reviews").map((guide) => (
          <li key={guide.slug}>
            <Link href={businessGuideHref(guide)} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">{guide.seoTitle}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
