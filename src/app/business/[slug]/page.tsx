import styles from "@/components/storefront/business-pages.module.css";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { BuyingGuide } from "@/components/storefront/buying-guide";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBusinessUsePageCopy } from "@/lib/business-use-content";
import { ProductCard } from "@/components/product/product-card";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { getPublicBusinessUseBySlug, getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getStorefrontProducts } from "@/lib/product-repository";
import { withoutSiteTitleSuffix } from "@/lib/metadata-title";
import { defaultSocialImage } from "@/lib/social-metadata";
import { getBusinessUseGuide } from "@/lib/business-use-guide-store";
import { groupBusinessUseProducts, orderBusinessUseProducts, resolveRecommendations } from "@/lib/business-use-guide";
import { googleReviewStandGuides } from "@/lib/google-review-stand-guides";
import { MultiLinkBundleSection } from "@/components/storefront/multilink-bundle";
import { getOffersSettings } from "@/lib/offer-settings";

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
    alternates: { canonical: `/business/${businessUse.slug}` },
    openGraph: {
      title,
      description,
      url: `/business/${businessUse.slug}`,
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
  const offers = guide.bundle ? await getOffersSettings().catch(() => null) : null;
  const assignedProducts = orderBusinessUseProducts(products, slug, businessUse.productSlugs);
  const recommendations = resolveRecommendations(guide, products);
  const googleReviewRecommendation = recommendations.find((item) => item.productSlug === "google-review-stand");
  const reviewStandGuide = googleReviewStandGuides.find((item) => item.solution === businessUse.slug);
  const { groups: productGroups, ungrouped: remainingProducts } = groupBusinessUseProducts(guide, products, assignedProducts, [...recommendations.map((item) => item.product.slug), ...(guide.bundle?.items.map((item) => item.productSlug) ?? [])]);
  const hasGrowthSections = Boolean(guide.audiences?.length || guide.challenges?.length);
  const heroImage = businessUse.bannerImageUrl || businessUse.imageUrl || "/uploads/products/no-photo-available.png";
  const copy = getBusinessUsePageCopy(businessUse);

  const recommendedSection = (
        <SectionShell tone={hasGrowthSections ? "white" : "soft"} spacing="compact">
          <div className="tr-container scroll-mt-28" id="recommended-stands">
            <SectionHeader
              eyebrow="Choose your customer’s next step"
              title={guide.recommendationsTitle || `Recommended Stands for ${businessUse.title}`}
              body={guide.recommendationsBody || "Start with one action. Each stand opens the destination you choose on your customer’s phone."}
              cta={{ href: "/shop", label: "Shop all stands" }}
            />
            {!guide.bundle && (guide.introduction || copy.body) ? (
              <p className="tr-body-sm mt-4 max-w-3xl whitespace-pre-line">{guide.introduction || copy.body}</p>
            ) : null}
            {recommendations.length > 0 ? <div className={`mt-8 tr-mobile-card-grid grid items-start gap-6 md:grid-cols-3 ${styles.recommendations}`}>
              {recommendations.map((item, index) => <article key={item.productSlug} className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5">
                <p className="tr-eyebrow">0{index + 1} / {index === 0 ? "Start here" : "Another way to connect"}</p>
                <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{item.goal}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{item.reason}</p>
                <p className="mb-5 mt-4 rounded-lg bg-soft p-3 text-sm leading-6"><strong>Where to place it:</strong> {item.placement}</p>
                <ProductCard product={item.product} />
                <Link href={`/product/${item.product.slug}`} className="tr-editorial-link mt-4">View {item.product.title} <span aria-hidden="true">→</span></Link>
              </article>)}
            </div> : null}
            {productGroups.length ? <>
              <h3 className="mt-12 text-2xl font-semibold">{guide.productGroupsTitle || `All stands for ${businessUse.title}`}</h3>
              {productGroups.map((group) => <div key={group.title} className="mt-8">
                <h4 className="text-xl font-semibold">{group.title}</h4>
                {group.body ? <p className="tr-body-sm mt-2 max-w-3xl">{group.body}</p> : null}
                <div className="tr-product-grid mt-5">{group.products.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
              </div>)}
            </> : null}
            {remainingProducts.length > 0 ? <h3 className="mt-10 text-xl font-semibold">{productGroups.length ? "More stands" : recommendations.length ? "More options for your business" : "Explore your stands"}</h3> : null}
          <div className="tr-product-grid mt-6">
            {remainingProducts.length > 0 ? (
              remainingProducts.map((product) => <ProductCard key={product.slug} product={product} />)
            ) : recommendations.length === 0 ? (
              <div className="col-span-full py-6 text-sm font-semibold text-muted">
                Find a stand for reviews, menus, booking, or social profiles in <Link href="/shop" className="underline">the full shop</Link>.
              </div>
            ) : null}
          </div>
            {reviewStandGuide ? (
              <p className="tr-body-sm mt-6">
                Need help with placement or setup? Read our guide to <Link href={reviewStandGuide.href} className="font-semibold text-brand underline underline-offset-4">{reviewStandGuide.label}</Link>.
              </p>
            ) : null}
          </div>
        </SectionShell>
  );

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={breadcrumbJsonLd([{ name: "Shop by business", href: "/business" }, { name: businessUse.title, href: `/business/${businessUse.slug}` }])} />
      <PageHero
        spacing="compact"
        backLink={{ href: "/business", label: "Shop by business" }}
        eyebrow={businessUse.title}
        title={guide.headline || `NFC Stands for ${businessUse.title}`}
        cta={guide.bundle ? { href: "#bundle", label: guide.bundle.ctaLabel || "Shop the bundle" } : { href: "#recommended-stands", label: "Find your stand" }}
        body={guide.heroBody || copy.intro}
        image={{
          src: heroImage,
          alt: businessUse.title,
          fit: "cover", priority: true
        }}
      />

      {guide.bundle ? <MultiLinkBundleSection bundle={guide.bundle} products={products} businessTitle={businessUse.title} offers={offers} /> : null}
      {/* The stands come right after the hero (and bundle), before the longer guidance. */}
      {recommendedSection}
      {guide.audiences?.length ? <SectionShell spacing="compact"><div className="tr-container">
        <SectionHeader eyebrow="Who it’s for" title={guide.audiencesTitle || `Stands for every kind of ${businessUse.title.toLowerCase()} business`} />
        <div className="mt-7 tr-mobile-card-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{guide.audiences.map((item, index) => {
          const product = item.productSlug ? products.find((candidate) => candidate.slug === item.productSlug) : undefined;
          return <article key={index} className="rounded-xl border border-line bg-white p-5">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="tr-body-sm mt-2">{item.body}</p>
            {product ? <Link href={`/product/${product.slug}`} className="tr-editorial-link mt-4">Start with the {product.title} <span aria-hidden="true">→</span></Link> : null}
          </article>;
        })}</div>
      </div></SectionShell> : null}
      {guide.challenges?.length ? <SectionShell tone="soft" spacing="compact"><div className="tr-container">
        <SectionHeader eyebrow={guide.challengesEyebrow || "What gets in the way"} title={guide.challengesTitle || "Common challenges"} body={guide.challengesIntro} />
        <div className="mt-7 tr-mobile-card-grid grid gap-5 md:grid-cols-2">{guide.challenges.map((item, index) => <article key={index} className="rounded-xl border border-line bg-white p-6">
          <p className="tr-eyebrow">0{index + 1}</p>
          <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
          <p className="tr-body-sm mt-3">{item.body}</p>
        </article>)}</div>
      </div></SectionShell> : null}

      {guide.placements?.length ? <SectionShell tone={hasGrowthSections ? "soft" : "white"} spacing="compact"><div className="tr-container">
        <SectionHeader title={guide.placementTitle || "Where to Place Your Stands"} />
        <div className="mt-7 tr-mobile-card-grid grid gap-6 md:grid-cols-3">{guide.placements.map((item, index) => {
          const product = products.find((candidate) => candidate.slug === item.productSlug);
          return <article key={index}>
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="tr-body-sm mt-3">{item.body}{product ? <> Compare the <Link href={`/product/${product.slug}`} className="font-semibold text-brand underline underline-offset-4">{product.title}</Link> for this placement.</> : null}</p>
          </article>;
        })}</div>
      </div></SectionShell> : null}
      {guide.bundle ? null : <SectionShell spacing="compact">
        <div className="tr-container">
          <SectionHeader eyebrow="Make it yours" title="Personalize your stand" body="Select your design on the product page. Available options and current prices appear before you buy." />
          <div className="mt-7 tr-mobile-card-grid grid gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-line p-6"><h3 className="text-xl font-semibold">Branded + QR</h3><p className="tr-body-sm mt-3">Your business name and logo, with NFC and a printed QR code. Visitors can tap or scan. Approve your design before payment.</p></div>
            <div className="rounded-xl border border-line p-6"><h3 className="text-xl font-semibold">Need several links?</h3><p className="tr-body-sm mt-3">Optional hosted Multi-Link puts your website, social profiles, and other links on one editable page. A separate monthly charge applies.</p><Link href="/multi-link" className="tr-editorial-link mt-4">Explore Multi-Link →</Link></div>
          </div>
        </div>
      </SectionShell>}
      {guide.steps?.length ? <SectionShell spacing="compact"><div className="tr-container">
        <SectionHeader title={guide.howItWorksTitle || "How Your Stand Works"} />
        <ol className="mt-7 tr-mobile-card-grid grid gap-6 md:grid-cols-3">{guide.steps.map((item, index) => <li key={index} className="rounded-xl border border-line p-6"><p className="tr-eyebrow">Step {index + 1}</p><h3 className="mt-3 text-xl font-semibold">{item.title}</h3><p className="tr-body-sm mt-3">{item.body}</p></li>)}</ol>
        <nav aria-label="More buying guidance" className="mt-6 flex flex-wrap gap-5 text-brand underline"><Link href="/how-it-works">How NFC stands work</Link><Link href="/pricing">Compare pricing</Link><Link href="/stand-bundles">Stands for multiple counters</Link></nav>
        {googleReviewRecommendation ? <p className="tr-body-sm mt-5">During Google review stand setup, search for your business by name and city or paste its review link. Check that the link opens the correct location before ordering.</p> : null}
      </div></SectionShell> : null}
      {guide.faqs.length ? <SectionShell tone="soft" spacing="compact"><div className="tr-container-narrow"><h2 className="tr-section-title">{guide.faqTitle || `${businessUse.title} Stand FAQs`}</h2><div className="mt-6 divide-y divide-line">{guide.faqs.map((faq, index) => <details key={index} className="py-5"><summary className="cursor-pointer text-lg font-semibold text-ink">{faq.question}</summary><p className="tr-body mt-3">{faq.answer}</p></details>)}</div></div></SectionShell> : null}
      {!guide.steps?.length && !guide.placements?.length ? <BuyingGuide slug={businessUse.slug} kind="solution" /> : null}
    </main>
  );
}
