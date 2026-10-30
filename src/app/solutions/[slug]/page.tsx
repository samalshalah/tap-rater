import styles from "@/components/storefront/business-pages.module.css";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { BuyingGuide } from "@/components/storefront/buying-guide";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessUsePageCopy } from "@/lib/business-use-content";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { getPublicBusinessUseBySlug, getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getStorefrontProducts } from "@/lib/product-repository";
import { withoutSiteTitleSuffix } from "@/lib/metadata-title";
import { defaultSocialImage } from "@/lib/social-metadata";
import { getBusinessUseGuide } from "@/lib/business-use-guide-store";
import { orderBusinessUseProducts, resolveRecommendations } from "@/lib/business-use-guide";

type BusinessUsePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BusinessUsePageProps): Promise<Metadata> {
  const { slug } = await params;
  const businessUse = await getPublicBusinessUseBySlug(slug);
  if (!businessUse) {
    return { title: "Business Use Not Found" };
  }

  const socialImage = businessUse.bannerImageUrl || businessUse.imageUrl;
  const guide = await getBusinessUseGuide(slug);
  const title = withoutSiteTitleSuffix(businessUse.seoTitle || guide.seoTitle || `${businessUse.title} NFC Stands`);
  const description = businessUse.seoDescription || guide.seoDescription || businessUse.shortDescription || businessUse.description;
  return {
    title,
    description,
    alternates: { canonical: `/solutions/${businessUse.slug}` },
    openGraph: {
      title,
      description,
      url: `/solutions/${businessUse.slug}`,
      images: socialImage
        ? [{ url: socialImage, alt: businessUse.title }]
        : [defaultSocialImage]
    }
  };
}

export async function generateStaticParams() {
  const businessUses = await getPublicBusinessUses();
  return businessUses.map((businessUse) => ({ slug: businessUse.slug }));
}

export default async function BusinessUsePage({ params }: BusinessUsePageProps) {
  const { slug } = await params;
  const [businessUse, products] = await Promise.all([getPublicBusinessUseBySlug(slug), getStorefrontProducts()]);

  if (!businessUse) {
    notFound();
  }

  const guide = await getBusinessUseGuide(slug);
  const assignedProducts = orderBusinessUseProducts(products, slug, businessUse.productSlugs);
  const recommendations = resolveRecommendations(guide, products);
  const googleReviewRecommendation = recommendations.find((item) => item.productSlug === "google-review-stand");
  const remainingProducts = assignedProducts.filter((product) => !recommendations.some((item) => item.product.slug === product.slug));
  const heroImage = businessUse.bannerImageUrl || businessUse.imageUrl || "/uploads/products/no-photo-available.png";
  const copy = getBusinessUsePageCopy(businessUse);

  return (
    <main className={`tr-public-shell text-ink ${styles.page}`}>
      <JsonLd data={breadcrumbJsonLd([{ name: "Solutions", href: "/solutions" }, { name: businessUse.title, href: `/solutions/${businessUse.slug}` }])} />
      <PageHero className={styles.hero}
        spacing="compact"
        backLink={{ href: "/solutions", label: "Shop by business" }}
        eyebrow={businessUse.title}
        title={guide.headline || `NFC Stands for ${businessUse.title}`}
        cta={{ href: "#recommended-stands", label: "Find your stand" }}
        body={
          <>
            <p>{guide.introduction || copy.intro}</p>
            {!guide.introduction && copy.body ? (
              <div className="tr-body-sm mt-5 whitespace-pre-line">{copy.body}</div>
            ) : null}
          </>
        }
        image={{
          src: heroImage,
          alt: businessUse.title,
          fit: "cover", priority: true
        }}
      />

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container scroll-mt-28" id="recommended-stands">
          <SectionHeader
            eyebrow="Choose your customer’s next step"
            title={guide.recommendationsTitle || `Recommended Stands for ${businessUse.title}`}
            body="Start with one action. Each stand opens the destination you choose on your customer’s phone."
            cta={{ href: "/shop", label: "Shop all stands" }}
          />
          {recommendations.length > 0 ? <div className={`mt-8 grid items-start gap-6 md:grid-cols-3 ${styles.recommendations}`}>
            {recommendations.map((item, index) => <article key={item.productSlug} className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5">
              <p className="tr-eyebrow">0{index + 1} / {index === 0 ? "Start here" : "Another way to connect"}</p>
              <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{item.goal}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{item.reason}</p>
              <p className="mb-5 mt-4 rounded-lg bg-soft p-3 text-sm leading-6"><strong>Where to place it:</strong> {item.placement}</p>
              <ProductCard product={item.product} />
              <Link href={`/product/${item.product.slug}`} className="tr-editorial-link mt-4">View {item.product.title} <span aria-hidden="true">→</span></Link>
            </article>)}
          </div> : null}
          {remainingProducts.length > 0 ? <h3 className="mt-10 text-xl font-semibold">{recommendations.length ? "More options for your business" : "Explore your stands"}</h3> : null}
        <div className="tr-product-grid mt-6">
          {remainingProducts.length > 0 ? (
            remainingProducts.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : recommendations.length === 0 ? (
            <div className="col-span-full py-6 text-sm font-semibold text-muted">
              Find a stand for reviews, menus, booking, or social profiles in <Link href="/shop" className="underline">the full shop</Link>.
            </div>
          ) : null}
        </div>
          <Link href="/solutions" className="tr-editorial-link mt-8">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to businesses
          </Link>
        </div>
      </SectionShell>
      {guide.placements?.length ? <SectionShell spacing="compact"><div className="tr-container">
        <SectionHeader title={guide.placementTitle || "Where to Place Your Stands"} />
        <div className="mt-7 grid gap-6 md:grid-cols-3">{guide.placements.map((item, index) => {
          const product = products.find((candidate) => candidate.slug === item.productSlug);
          return <article key={index}>
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="tr-body-sm mt-3">{item.body}{product ? <> Compare the <Link href={`/product/${product.slug}`} className="font-semibold text-brand underline underline-offset-4">{product.title}</Link> for this placement.</> : null}</p>
          </article>;
        })}</div>
      </div></SectionShell> : null}
      <SectionShell spacing="compact">
        <div className="tr-container">
          <SectionHeader eyebrow="Make it yours" title="Personalize your stand" body="Select your design on the product page. Available options and current prices appear before you buy." />
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-line p-6"><h3 className="text-xl font-semibold">Branded + QR</h3><p className="tr-body-sm mt-3">Your business name and logo, with NFC and a printed QR code. Visitors can tap or scan. Approve your design before payment.</p></div>
            <div className="rounded-xl border border-line p-6"><h3 className="text-xl font-semibold">Need several links?</h3><p className="tr-body-sm mt-3">Optional hosted Multi-Link puts your website, social profiles, and other links on one editable page. A separate monthly charge applies.</p><Link href="/multi-link" className="tr-editorial-link mt-4">Explore Multi-Link →</Link></div>
          </div>
        </div>
      </SectionShell>
      {guide.steps?.length ? <SectionShell spacing="compact"><div className="tr-container">
        <SectionHeader title={guide.howItWorksTitle || "How Your Stand Works"} />
        <ol className="mt-7 grid gap-6 md:grid-cols-3">{guide.steps.map((item, index) => <li key={index} className="rounded-xl border border-line p-6"><p className="tr-eyebrow">Step {index + 1}</p><h3 className="mt-3 text-xl font-semibold">{item.title}</h3><p className="tr-body-sm mt-3">{item.body}</p></li>)}</ol>
        <nav aria-label="More buying guidance" className="mt-6 flex flex-wrap gap-5 text-brand underline"><Link href="/how-it-works">How NFC stands work</Link><Link href="/pricing">Compare pricing</Link><Link href="/stand-bundles">Stands for multiple counters</Link></nav>
        {googleReviewRecommendation ? <p className="tr-body-sm mt-5">Setting up your review stand? Use the <Link href="/review-links-generator" className="font-semibold text-brand underline underline-offset-4">Google review link generator</Link> to find the correct business location, then test the link before ordering.</p> : null}
      </div></SectionShell> : null}
      {guide.faqs.length ? <SectionShell tone="soft" spacing="compact"><div className="tr-container-narrow"><h2 className="tr-section-title">{guide.faqTitle || `${businessUse.title} Stand FAQs`}</h2><div className="mt-6 divide-y divide-line">{guide.faqs.map((faq, index) => <details key={index} className="py-5"><summary className="cursor-pointer text-lg font-semibold text-ink">{faq.question}</summary><p className="tr-body mt-3">{faq.answer}</p></details>)}</div></div></SectionShell> : null}
      {!guide.steps?.length && !guide.placements?.length ? <BuyingGuide slug={businessUse.slug} kind="solution" /> : null}
    </main>
  );
}
