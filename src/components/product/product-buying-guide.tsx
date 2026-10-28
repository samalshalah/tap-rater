import Link from "next/link";
import type { ProductBuyingGuide as BuyingGuide } from "@/data/product-buying-guides";
import { SectionShell } from "@/components/storefront/section";

export function ProductBuyingGuide({ title, slug, guide }: { title: string; slug: string; guide: BuyingGuide }) {
  return (
    <SectionShell spacing="compact">
      <div className="tr-container-narrow" data-product-buying-guide={slug}>
        <p className="tr-eyebrow">Plan your setup</p>
        <h2 className="tr-section-title mt-2">Placement & setup</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">Where to place it</h3>
            <p className="tr-body mt-2">{guide.placement}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Choose the right destination</h3>
            <p className="tr-body mt-2">{guide.destination}</p>
          </div>
        </div>
        <nav aria-label={`${title} setup resources`} className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-brand underline underline-offset-4">
          <Link href="/how-it-works">How stand setup works</Link>
          <Link href="/shipping">Preparation and shipping</Link>
          <Link href="/solutions">Find stands for your business</Link>
          {slug === "yelp-review-stand" ? <a href="https://www.yelp-support.com/article/Don-t-Ask-for-Reviews?l=en_US">Yelp's review policy</a> : null}
          {slug === "caredash-review-stand" ? <Link href="/product/patient-resources-stand">Explore Patient Resources</Link> : null}
        </nav>
      </div>
    </SectionShell>
  );
}
