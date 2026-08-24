import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getHomepageThemeContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Custom NFC and QR Stands",
  description: "Custom Branding options for Tap Rater tabletop NFC and QR stands where supported."
};

export default async function CustomStandsPage() {
  const { customBranding } = await getHomepageThemeContent();

  return (
    <main className="bg-white text-ink">
      <section className="bg-white">
        <div className="tr-container grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
          <div>
            <p className="tr-eyebrow">{customBranding.eyebrow || "Custom Branding"}</p>
            <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.25rem]">{customBranding.headline}</h1>
            <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-[#5f686f]">{customBranding.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={customBranding.cta.href} className="tr-button-primary px-7">
                {customBranding.cta.label}
              </Link>
              <Link href="/shop" className="tr-editorial-link">
                Shop Ready Stands
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="tr-page-hero-media relative aspect-[4/3] overflow-hidden rounded-[34px] bg-[#f7f8f8] shadow-[0_22px_70px_rgba(16,32,30,0.08)]">
            <Image src={customBranding.image.src} alt={customBranding.image.alt} fill unoptimized className="object-contain object-center p-4 mix-blend-multiply" />
          </div>
        </div>
      </section>
      <section className="bg-[#f7f8f8]">
        <div className="tr-container grid gap-5 py-12 md:grid-cols-4">
          {customBranding.bullets.map((item) => (
            <article key={item} className="rounded-[24px] border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">Controlled branded setup remains connected to supported product configuration and proof approval.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
