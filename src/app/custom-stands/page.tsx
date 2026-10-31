import styles from "@/components/storefront/type-pages.module.css";
import type { Metadata } from "next";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { getHomepageThemeContent } from "@/lib/website-content";
import { CategoryBuyingGuide } from "@/components/storefront/category-buying-guide";
import { getStorefrontProducts } from "@/lib/product-repository";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Custom NFC and QR Stands",
  description: "Compare custom NFC stands with your logo, business name, and QR. Choose a destination, review the Branded artwork preview, and plan your counter display.",
  alternates: { canonical: "/custom-stands" }
};

export default async function CustomStandsPage() {
  const [{ customBranding }, products] = await Promise.all([getHomepageThemeContent(), getStorefrontProducts()]);
  const bulletDescriptions = [
    "Upload the logo file where a supported branded template is available.",
    "Add the business name exactly as it should appear on the stand.",
    "Choose your destination. Branded QR is generated from the destination used by NFC.",
    "Approve the artwork preview before payment. Final print artwork is generated after payment."
  ];

  return (
    <main className={`tr-public-shell text-ink ${styles.page}`}>
      <JsonLd data={breadcrumbJsonLd([{ name: "Shop all stands", href: "/shop" }, { name: "Custom stands", href: "/custom-stands" }])} />
      <PageHero className={styles.hero}
        eyebrow={customBranding.eyebrow || "Custom Branding"}
        title="Branded + QR stands"
        body={customBranding.body}
        cta={{ href: "/shop?design=branded", label: "Shop Branded + QR stands" }}
        image={{ ...customBranding.image, priority: true }}
      />
      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Branded setup"
            title="A clear branded setup before production."
            body="Branded stands include your logo, business name, and a QR code generated from your destination. Approve the artwork preview before payment. Final print artwork is generated after payment."
          />
        <div className="mt-8 tr-mobile-card-grid grid gap-5 md:grid-cols-4">
          {customBranding.bullets.map((item, index) => (
            <article key={item} className="tr-card p-6">
              <h3 className="tr-card-title">{item}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{bulletDescriptions[index] ?? "Approve the artwork preview before payment. Final print artwork is generated after payment."}</p>
            </article>
          ))}
        </div>
        </div>
      </SectionShell>
      <CategoryBuyingGuide slug="custom-stands" products={products} />
    </main>
  );
}
