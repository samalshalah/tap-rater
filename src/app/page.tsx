import type { Metadata } from "next";
import { HomepageLayout } from "@/components/storefront/homepage-layout";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getHomepageThemeContent } from "@/lib/website-content";
import { defaultSocialImage } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: "Tap Rater NFC Business Stands | Reviews, Menus & More",
  description: "Shop Tap Rater NFC stands for reviews, menus, bookings and social follows. Standard is NFC-only. Branded adds your logo, business name and a destination QR code.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Tap Rater NFC Business Stands",
    description: "One tap to your business link. Explore Standard and Branded stands, with optional Multi-Link pages.",
    url: "/",
    images: [defaultSocialImage]
  }
};

export default async function HomePage() {
  const [content, products, businessUses] = await Promise.all([getHomepageThemeContent(), getStorefrontProducts(), getPublicBusinessUses()]);
  return <div className="tr-homepage text-ink">
    <JsonLd data={organizationJsonLd()} />
    <JsonLd data={websiteJsonLd()} />
    <HomepageLayout content={content} products={products} businessUses={businessUses} />
  </div>;
}
