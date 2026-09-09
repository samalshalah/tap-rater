import type { Metadata } from "next";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { getHomepageThemeContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Custom NFC and QR Stands",
  description: "Custom Branding options for Tap Rater tabletop NFC and QR stands where supported.",
  alternates: { canonical: "/custom-stands" }
};

export default async function CustomStandsPage() {
  const { customBranding } = await getHomepageThemeContent();
  const bulletDescriptions = [
    "Upload the logo file where a supported branded template is available.",
    "Add the business name exactly as it should appear on the stand.",
    "Choose your destination. Branded QR is generated from the destination used by NFC.",
    "Approve the artwork preview before payment. Final print artwork is generated after payment."
  ];

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow={customBranding.eyebrow || "Custom Branding"}
        title={customBranding.headline}
        body={customBranding.body}
        cta={{ href: customBranding.cta.href, label: "Shop supported custom options" }}
        image={customBranding.image}
      />
      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Branded setup"
            title="A clear branded setup before production."
            body="Branded stands include your logo, business name, and a QR code generated from your destination. Approve the artwork preview before payment. Final print artwork is generated after payment."
          />
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {customBranding.bullets.map((item, index) => (
            <article key={item} className="tr-card p-6">
              <h2 className="tr-card-title">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{bulletDescriptions[index] ?? "Approve the artwork preview before payment. Final print artwork is generated after payment."}</p>
            </article>
          ))}
        </div>
        </div>
      </SectionShell>
    </main>
  );
}
