import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { businessGuides, businessGuideHref, getBusinessGuide } from "@/data/business-guides";
import { businessGuideContent } from "@/content/business-guides";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { FaqList } from "@/components/storefront/faq-list";
import { ResponsiveUpload } from "@/components/storefront/responsive-upload";
import { absoluteUrl, breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import styles from "../guides.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return businessGuides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getBusinessGuide((await params).slug);
  if (!guide) notFound();
  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: { canonical: businessGuideHref(guide) },
    openGraph: {
      type: "article",
      title: guide.seoTitle,
      description: guide.description,
      url: businessGuideHref(guide),
      publishedTime: guide.published,
      modifiedTime: guide.published,
      authors: ["Tap Rater"],
      images: [{ url: guide.image, width: 1200, height: 1200, alt: guide.imageAlt }]
    },
    twitter: { card: "summary_large_image", title: guide.seoTitle, description: guide.description, images: [guide.image] }
  };
}

export default async function BusinessGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getBusinessGuide((await params).slug);
  if (!guide) notFound();
  const content = businessGuideContent[guide.slug];
  if (!content) notFound();

  return <main className="tr-public-shell text-ink">
    <JsonLd data={breadcrumbJsonLd([
      { name: "Home", href: "/" },
      { name: "Business guides", href: "/guides" },
      { name: guide.title, href: businessGuideHref(guide) }
    ])} />
    <JsonLd data={{
      "@context": "https://schema.org", "@type": "Article",
      "@id": `${absoluteUrl(businessGuideHref(guide))}#article`,
      mainEntityOfPage: absoluteUrl(businessGuideHref(guide)),
      headline: guide.title, description: guide.description,
      image: [absoluteUrl(guide.image)],
      datePublished: guide.published, dateModified: guide.published,
      author: { "@type": "Organization", name: "Tap Rater", url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: "Tap Rater", url: absoluteUrl("/"), logo: { "@type": "ImageObject", url: absoluteUrl("/uploads/brand/tap-rater-logo.png") } },
      inLanguage: "en-US", articleSection: guide.category
    }} />
    <PageHero
      eyebrow={`${guide.category} guide`}
      title={guide.title}
      body={guide.description}
      image={{ src: guide.image, alt: guide.imageAlt, fit: "contain", priority: true }}
      backLink={{ href: "/guides", label: "All business guides" }}
    />
    <SectionShell spacing="compact">
      <div className={`tr-container ${styles.layout}`}>
        <aside className={styles.contents}>
          <nav aria-label="On this page">
            <p className="tr-eyebrow">In this guide</p>
            <ul>
              {content.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
              <li><a href="#questions">Common questions</a></li>
            </ul>
          </nav>
        </aside>
        <article className={styles.article} aria-label={guide.title}>
          <p className={styles.byline}>By <Link href="/">Tap Rater</Link> · Published <time dateTime={guide.published}>November 27, 2026</time></p>
          <p className={styles.answer}>{content.answer}</p>
          {content.sections.map((section) => <section key={section.id} id={section.id} className={styles.section}>
            <h2>{section.title}</h2>
            <div className={styles.prose}>{section.content}</div>
          </section>)}
          <section id="questions" className={styles.section}>
            <h2>Common questions</h2>
            <FaqList faqs={content.faqs} className="mt-6 grid gap-3" />
          </section>
          <section className={styles.sources} aria-label="Official resources">
            <h2>Official resources</h2>
            <ul>{content.sources.map((source) => <li key={source.href}><a href={source.href}>{source.label}</a></li>)}</ul>
          </section>
        </article>
      </div>
    </SectionShell>
    <SectionShell tone="soft" spacing="compact">
      <div className={`tr-container ${styles.product}`}>
        <Link href={guide.productHref} className={styles.productImage} aria-label={`View the ${guide.productName}`}>
          <ResponsiveUpload src={guide.image} alt={guide.imageAlt} fallbackWidth={640} sizes="(min-width: 768px) 320px, 85vw" className="object-contain" />
        </Link>
        <div>
          <p className="tr-eyebrow">Your logo. Your link.</p>
          <h2 className="tr-section-title mt-3">Make room for your brand at the counter</h2>
          <p className="tr-body mt-4">A 6.5 × 4.25-inch custom acrylic stand with NFC and QR. Printed in the USA, with free U.S. shipping. $49 once for Direct, with no required subscription.</p>
          <p className="tr-body-sm mt-3">Check your design and destination before approving the artwork and paying.</p>
          <Link href={guide.productHref} className="tr-button-primary mt-6">Personalize my {guide.category === "Instagram" ? "Instagram" : "Google review"} stand</Link>
        </div>
      </div>
    </SectionShell>
    <SectionShell spacing="compact">
      <div className="tr-container">
        <h2 className="tr-section-title">Keep learning</h2>
        <div className={styles.related}>
          {businessGuides.filter((item) => item.slug !== guide.slug).map((item) => <Link key={item.slug} href={businessGuideHref(item)} className={styles.relatedLink}>
            <span className="tr-eyebrow">{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Link>)}
        </div>
      </div>
    </SectionShell>
  </main>;
}
