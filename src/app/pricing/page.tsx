import Link from "next/link";
import type { Metadata } from "next";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { getOffersSettings } from "@/lib/offer-settings";
import { singleStandPrice } from "@/lib/offers";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { ProductOffers } from "@/components/product/product-offers";
export const metadata: Metadata = {
  title: "NFC Stand Pricing | Standard, Branded & Bundles",
  description:
    "Compare Tap Rater Standard NFC-only and Branded + QR stands, current automatic offers, optional Multi-Link hosting and shipping.",
  alternates: { canonical: "/pricing" },
};
export default async function PricingPage() {
  const [products, offers] = await Promise.all([
    getStorefrontProducts(),
    getOffersSettings(),
  ]);
  const minimum = (id: string) => {
    const prices = products
      .filter((p) => p.checkoutMode === "buy_now")
      .flatMap((p) =>
        getProductPurchaseOptions(p)
          .filter((o) => o.id === id)
          .map((o) => singleStandPrice(p.slug, o.id, o.priceCents, offers)),
      );
    return prices.length
      ? `From ${formatPrice(Math.min(...prices))}`
      : "See product options";
  };
  const prices = [
    [
      "Standard Direct",
      minimum("standard_direct"),
      "Ready-made design with NFC opening one destination. No printed QR. One-time stand purchase; no hosted subscription required.",
      "/shop",
    ],
    [
      "Branded + QR",
      minimum("branded_qr_direct"),
      "Your logo, business name and a printed QR code alongside NFC. Review and approve your artwork preview before payment. Current eligible single-stand savings are included in the price above.",
      "/custom-stands",
    ],
    [
      "Optional Multi-Link",
      `${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month`,
      `An editable hosted Tap Rater page with up to ${hostedMultiLinkServiceAddon.maxLinks} links. The physical stand is purchased separately. Hosting is optional and excluded from stand discounts.`,
      "/multi-link",
    ],
  ];
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Pricing"
        title="Choose the design and service you need."
        body="Direct stands are a one-time purchase. Compare NFC-only Standard, Branded with QR, and optional hosted Multi-Link. Final prices depend on your selected product and configuration."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container grid gap-4 md:grid-cols-3">
          {prices.map(([title, price, body, href]) => (
            <article key={title} className="tr-card flex flex-col gap-4 p-5">
              <h2 className="tr-card-title">{title}</h2>
              <p className="text-2xl font-semibold">{price}</p>
              <p className="tr-body-sm">{body}</p>
              <Link href={href} className="tr-button-primary mt-auto w-fit">
                View options
              </Link>
            </article>
          ))}
        </div>
      </SectionShell>
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <h2 className="tr-section-title">Ordering several stands?</h2>
          <p className="tr-body mt-4">
            Mix products for different counters or business locations. The cart
            applies the best eligible discount automatically. Offers do not
            combine, and shipping eligibility uses the subtotal after discounts.
          </p>
          <div className="mt-5">
            <ProductOffers settings={offers} />
          </div>
          <nav className="mt-5 flex flex-wrap gap-5 text-brand underline">
            <Link href="/stand-bundles">Explore stand bundles</Link>
            <Link href="/shipping">Shipping details</Link>
            <Link href="/refund-policy">Returns and order changes</Link>
          </nav>
          <h2 className="tr-section-title mt-8">
            What does a direct stand include?
          </h2>
          <p className="tr-body mt-4">
            A physical stand configured with the destination supplied during
            checkout. Standard uses NFC only; Branded adds a QR code from the
            same destination. Website, booking and social services at that
            destination remain managed by their own provider. Taxes and any
            shipping charges appear at checkout.
          </p>
          <p className="tr-body mt-4">
            For work outside the available product options,{" "}
            <Link href="/contact-us" className="text-brand underline">
              request a custom quote
            </Link>{" "}
            before ordering.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
