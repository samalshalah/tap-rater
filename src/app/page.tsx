import { getOffersSettings } from "@/lib/offer-settings";
import type { Metadata } from "next";
import { HomepageLayout } from "@/components/storefront/homepage-layout";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getHomepageThemeContent } from "@/lib/website-content";
import { defaultSocialImage } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: "Tap Rater NFC Business Stands | Reviews, Menus & More",
  description: "Custom NFC and QR stands with your logo for reviews, menus and social follows. Large 6.5 × 4.25-inch display, printed in the USA. Free U.S. shipping.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Tap Rater NFC Business Stands",
    description: "Your logo on a large 6.5 × 4.25-inch NFC and QR stand. Printed in the USA, with free U.S. shipping.",
    url: "/",
    images: [defaultSocialImage]
  }
};

export default async function HomePage() {
  const [content, products, businessUses, offers] = await Promise.all([getHomepageThemeContent(), getStorefrontProducts(), getPublicBusinessUses(), getOffersSettings()]);
  return <div className="tr-homepage text-ink">
    <JsonLd data={organizationJsonLd()} />
    <JsonLd data={websiteJsonLd()} />
    <HomepageLayout offers={offers} content={content} products={products} businessUses={businessUses} />
  </div>;
}
