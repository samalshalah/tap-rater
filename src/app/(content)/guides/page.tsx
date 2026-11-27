import type { Metadata } from "next";
import Link from "next/link";
import { businessGuides, businessGuideHref } from "@/data/business-guides";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { ResponsiveUpload } from "@/components/storefront/responsive-upload";
import { googleReviewStandGuides } from "@/lib/google-review-stand-guides";
import { absoluteUrl, breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import styles from "./guides.module.css";

export const metadata: Metadata = {
  title: "Google Review and Instagram Guides for Businesses",
  description: "Practical guides to Google review links, review request templates, Instagram QR codes, and using custom NFC stands at your business.",
  alternates: { canonical: "/guides" },
  openGraph: { title: "Business guides | Tap Rater", description: "Set up your links, invite honest feedback, and help customers find your social profiles.", url: "/guides", type: "website", images: [businessGuides[0].image] }
};

export default function GuidesPage() {
  return <main className="tr-public-shell text-ink">
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", href: "/" }, { name: "Business guides", href: "/guides" }])} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Tap Rater business guides", url: absoluteUrl("/guides"), mainEntity: { "@type": "ItemList", itemListElement: businessGuides.map((guide, i) => ({ "@type": "ListItem", position: i + 1, name: guide.title, url: absoluteUrl(businessGuideHref(guide)) })) } }} />
    <PageHero eyebrow="Tap Rater guides" title="Make the next customer connection easier" body="Practical help with Google reviews, Instagram follows, and the links behind your custom stand." image={{ src: businessGuides[0].image, alt: businessGuides[0].imageAlt, fit: "contain", priority: true }} />
    <SectionShell spacing="compact">
      <div className="tr-container">
        <h2 className="tr-section-title">Reviews and social follows</h2>
        <div className={styles.guideGrid}>
          {businessGuides.map((guide) => <article key={guide.slug} className={styles.guideCard}>
            <Link href={businessGuideHref(guide)} className={styles.cardImage} aria-label={guide.title}>
              <ResponsiveUpload src={guide.image} alt={guide.imageAlt} fallbackWidth={640} sizes="(min-width: 1024px) 480px, 85vw" className="object-contain" />
            </Link>
            <div className={styles.cardCopy}>
              <p className="tr-eyebrow">{guide.category}</p>
              <h3><Link href={businessGuideHref(guide)}>{guide.title}</Link></h3>
              <p>{guide.description}</p>
              <Link href={businessGuideHref(guide)} className="tr-button-outline mt-5">Read guide</Link>
            </div>
          </article>)}
        </div>
      </div>
    </SectionShell>
    <SectionShell tone="soft" spacing="compact">
      <div className="tr-container">
        <h2 className="tr-section-title">Choosing and placing your stand</h2>
        <ul className={styles.placementLinks}>
          <li><Link href="/nfc-vs-qr-google-review-stand">NFC and QR: how tap and scan work together</Link></li>
          {googleReviewStandGuides.map((guide) => <li key={guide.href}><Link href={guide.href}>{guide.label}</Link></li>)}
        </ul>
      </div>
    </SectionShell>
  </main>;
}
