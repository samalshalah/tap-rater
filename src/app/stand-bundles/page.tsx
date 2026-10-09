import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { ProductOffers } from "@/components/product/product-offers";
import { getOffersSettings } from "@/lib/offer-settings";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
export const metadata: Metadata = {
  title: "NFC Stand Bundles for Multiple Counters",
  description:
    "Mix Tap Rater review, menu and social stands for multiple counters. Compare automatic bundle offers, Standard NFC-only and Branded + QR designs.",
  alternates: { canonical: "/stand-bundles" },
};
export default async function StandBundlesPage() {
  const offers = await getOffersSettings();
  return (
    <main className="tr-public-shell text-ink">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Shop", href: "/shop" },
          { name: "Stand bundles", href: "/stand-bundles" },
        ])}
      />
      <PageHero
        eyebrow="Stand bundles"
        title="The right stand for every counter."
        body="Choose several stands for your business, mix products and select a destination for each setup. Available automatic offers are applied in the cart."
      />
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <h2 className="tr-section-title">Build your own mix</h2>
          <p className="tr-body mt-4">
            Combine review stands for checkout, menu stands for ordering areas
            and social stands for reception. Choose Standard for NFC-only or
            Branded to add your logo, business name and a printed QR code. Each
            setup connects to the destination you provide.
          </p>
          <p className="tr-body mt-4">
            Add separate cart items when different locations need different
            links or artwork. Increasing the quantity of one configured item
            orders multiple copies of that setup. Check the destination and
            design on every item before checkout.
          </p>
          <div className="mt-6">
            <ProductOffers settings={offers} />
          </div>
          <h2 className="tr-section-title mt-8">
            One-time stands, optional hosting
          </h2>
          <p className="tr-body mt-4">
            Direct stands are a one-time physical purchase. Optional hosted
            Multi-Link has a separate recurring fee and is excluded from stand
            discounts. Your cart shows the best eligible offer; discounts do not
            stack. Shipping is calculated on the subtotal after discounts.
          </p>
          <nav className="mt-6 flex flex-wrap gap-4">
            <Link href="/shop" className="tr-button-primary">
              Choose your stands
            </Link>
            <Link href="/pricing" className="tr-button-secondary">
              Compare pricing
            </Link>
          </nav>
        </div>
      </SectionShell>
    </main>
  );
}
