import type { Metadata } from "next";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { ResponsiveUpload } from "@/components/storefront/responsive-upload";
import { getBusinessUseImagePosition } from "@/lib/storefront-visuals";
import { ArrowUpRight } from "lucide-react";
import styles from "@/components/storefront/business-pages.module.css";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop NFC Stands by Business",
  description:
    "Shop Tap Rater NFC and QR tabletop stands by business use: restaurants, dealerships, healthcare, beauty, hospitality, retail, real estate, events, and more.",
  alternates: { canonical: "/solutions" }
};

export default async function SolutionsPage() {
  const businessUses = await getPublicBusinessUses();
  const visibleBusinessUses = businessUses;

  return (
    <main className={`tr-public-shell text-ink ${styles.page}`}>
      <PageHero className={styles.hero}
        eyebrow="Shop by business"
        title="Your business. Their next step."
        body="From restaurant tables to reception desks, find a stand that helps customers reach your reviews, menus, booking pages, and more. Choose your business to get started."
        cta={{ href: "#businesses", label: "Find your business" }}
        image={{
          src: visibleBusinessUses[0]?.bannerImageUrl || visibleBusinessUses[0]?.imageUrl || "/uploads/use-cases/restaurants-cafes.webp",
          alt: visibleBusinessUses[0]?.title || "Tap Rater business use",
          fit: "cover", priority: true
        }}
      />

      <SectionShell tone="soft">
        <div className="tr-container scroll-mt-28" id="businesses">
          <SectionHeader
            eyebrow="Shop by business"
            title="Where will your stand go?"
            body="Explore products for your setting, then choose the destination and design that work for you."
          />
          <div className={styles.collection}>
            {visibleBusinessUses.map((useCase) => {
              const src = useCase.bannerImageUrl || useCase.imageUrl || "/uploads/products/no-photo-available.png";
              return <Link key={useCase.slug} href={`/solutions/${useCase.slug}`} className={styles.card}>
                <ResponsiveUpload src={src} alt={useCase.title} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 60vw" fallbackWidth={1200} style={{ objectPosition: getBusinessUseImagePosition(src) }} />
                <div className={styles.cardCopy}><h2 className={styles.cardTitle}>{useCase.title}<ArrowUpRight size={20} aria-hidden="true" /></h2><p>{useCase.shortDescription || useCase.description}</p></div>
              </Link>;
            })}
          </div>
          <div className="mt-10 flex flex-col justify-between gap-4 rounded-xl border border-line bg-white p-6 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold">Don’t see your business?</h2><p className="mt-2 text-sm text-muted">Choose by what customers should do: review, follow, book, or open a link.</p></div><Link href="/shop" className="tr-editorial-link shrink-0">Shop all stands →</Link></div>
        </div>
      </SectionShell>
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <h2 className="tr-section-title">Looking for a stand for Google reviews?</h2>
          <p className="tr-body mt-4">For a restaurant checkout, reception desk, or service counter, the <Link href="/product/google-review-stand" className="font-semibold text-brand underline underline-offset-4">review stand for Google Reviews</Link> connects visitors to your business’s review form. Every custom stand includes NFC, your logo, business name, and a printed QR code.</p>
          <p className="tr-body mt-4">Already have an eligible Google Business Profile? Find its destination with our <Link href="/review-links-generator" className="font-semibold text-brand underline underline-offset-4">Google review link generator</Link> and check the business location before ordering.</p>
          <Link href="/product/google-review-stand" className="tr-button-primary mt-6">Shop review stand for Google Reviewss</Link>
        </div>
      </SectionShell>
    </main>
  );
}
