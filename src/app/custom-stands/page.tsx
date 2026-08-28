import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getHomepageThemeContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Custom NFC and QR Stands",
  description: "Custom Branding options for Tap Rater tabletop NFC and QR stands where supported."
};

export default async function CustomStandsPage() {
  const { customBranding } = await getHomepageThemeContent();
  const bulletDescriptions = [
    "Upload the logo file where a supported branded template is available.",
    "Add the business name exactly as it should appear in the customer proof.",
    "Choose the destination URL the QR and NFC setup should use.",
    "Review the generated proof before Tap Rater prepares the stand."
  ];

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="hero">
        <div className="tr-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="tr-eyebrow">{customBranding.eyebrow || "Custom Branding"}</p>
            <h1 className="tr-page-title mt-4 max-w-4xl">{customBranding.headline}</h1>
            <p className="tr-body mt-5 max-w-3xl text-lg sm:text-xl">{customBranding.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={customBranding.cta.href} className="tr-button-primary px-7">
                Shop supported custom options
              </Link>
              <Link href="/shop" className="tr-editorial-link">
                Shop Ready Stands
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="tr-premium-surface relative aspect-[4/3]">
            <Image src={customBranding.image.src} alt={customBranding.image.alt} fill unoptimized className="object-contain object-center p-4 mix-blend-multiply" />
          </div>
        </div>
      </SectionShell>
      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Branded setup"
            title="A controlled proof flow before production."
            body="Custom stands follow the same product setup path: provide the business details, review the proof, then Tap Rater prepares the stand."
          />
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {customBranding.bullets.map((item, index) => (
            <article key={item} className="tr-card p-6">
              <h2 className="tr-card-title">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{bulletDescriptions[index] ?? "Tap Rater reviews the provided details before production."}</p>
            </article>
          ))}
        </div>
        </div>
      </SectionShell>
    </main>
  );
}
