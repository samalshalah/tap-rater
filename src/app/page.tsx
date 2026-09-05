import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Link2, ShoppingBag, Truck } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { FaqList } from "@/components/storefront/faq-list";
import { ProcessStepCard } from "@/components/storefront/process-step-card";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { HomepageBrowseCard } from "@/components/storefront/homepage-browse-card";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getStorefrontProducts } from "@/lib/product-repository";
import { selectMobileHomepageProducts } from "@/lib/homepage-products";
import { getCatalogCategories } from "@/lib/products";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { isHostedPurchaseOptionEnabled } from "@/lib/purchase-options";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getHomepageThemeContent, orderedEnabledFaqs, type HomepageHowItWorksContent } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "NFC & QR Stands for Reviews, Menus, Booking, Social Media and More",
  description:
    "Custom tabletop NFC and QR stands that let customers tap or scan to open your review, menu, booking, social media, feedback, or custom link instantly.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NFC & QR Stands for Reviews, Menus, Booking, Social Media and More | Tap Rater",
    description:
      "Custom tabletop NFC and QR stands for local businesses. Choose a stand, add your link, and Tap Rater prepares it for your counter.",
    url: "/"
  }
};

export default async function HomePage() {
  const [content, businessUses, products] = await Promise.all([getHomepageThemeContent(), getPublicBusinessUses(), getStorefrontProducts()]);
  const categories = getCatalogCategories();
  const completeBusinessUses = businessUses.filter((businessUse) => Boolean(businessUse.bannerImageUrl || businessUse.imageUrl));
  const configuredFeaturedUses = content.featuredUses.businessUseSlugs.length
    ? content.featuredUses.businessUseSlugs.flatMap((slug) => businessUses.find((businessUse) => businessUse.slug === slug) ?? [])
    : [];
  const featuredUses = mergeFeaturedUses(configuredFeaturedUses, completeBusinessUses).slice(0, 4);
  const productSections = categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.categorySlug === category.slug).slice(0, 4)
    }))
    .filter((section) => section.products.length > 0);
  const faqs = orderedEnabledFaqs(content.faqs, "global").slice(0, 4);
  const mobileProducts = selectMobileHomepageProducts(productSections.map((section) => section.products));

  return (
    <main className="tr-homepage text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      {content.hero.enabled ? (
        <SectionShell spacing="hero" className="pb-6 pt-6 sm:pb-12 sm:pt-10 lg:pb-20 lg:pt-14">
          <div className="tr-container grid gap-7 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
            <div className="max-w-[660px] lg:pt-8">
              <p className="tr-eyebrow">{content.hero.eyebrow}</p>
              <h1 className="tr-hero-title mt-3 lg:mt-5">
                {content.hero.headline}
              </h1>
              <p className="tr-body mt-4 max-w-[580px] text-lg sm:text-xl lg:mt-6">{content.hero.body}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:gap-5 lg:mt-8">
                <Link href={content.hero.primaryCta.href} className="tr-button-primary px-7">
                  {content.hero.primaryCta.label}
                </Link>
                {content.hero.secondaryCta ? (
                  <Link href={content.hero.secondaryCta.href} className="tr-editorial-link">
                    {content.hero.secondaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
              {content.hero.proofPoints.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2.5 lg:mt-6">
                  {content.hero.proofPoints.map((point) => (
                    <span key={point} className="tr-pill-neutral bg-white">
                      {point}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative h-[240px] overflow-hidden sm:h-[360px] lg:h-auto lg:min-h-[580px]">
              <Image
                src={optimizedUploadSrc(content.hero.image.src, 1200)}
                alt={content.hero.image.alt}
                fill
                priority
                fetchPriority="high"
                unoptimized
                className="scale-[0.96] object-contain object-center mix-blend-multiply sm:scale-100 lg:scale-[1.03]"
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
            </div>
          </div>
        </SectionShell>
      ) : null}

      {mobileProducts.length > 0 ? (
        <SectionShell className="py-8 sm:py-10 lg:hidden">
          <div className="tr-container">
            <SectionHeader eyebrow="Tap Rater stands" title="Shop stands" cta={{ href: "/shop", label: "View all stands" }} />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" data-home-mobile-products>
              {mobileProducts.map((product) => <ProductCard key={product.slug} product={product} density="catalog" />)}
            </div>
          </div>
        </SectionShell>
      ) : null}

      {content.actions.enabled ? (
        <SectionShell tone="soft" className="py-8 sm:py-10 lg:py-20">
          <div className="tr-container">
            <SectionHeader eyebrow={content.actions.eyebrow} title={content.actions.headline} cta={{ href: "/shop", label: "Shop All Stands" }} />
            <div className="mt-5 grid divide-y divide-line lg:mt-10 lg:grid-cols-2 lg:gap-5 lg:divide-y-0 xl:grid-cols-4">
              {content.actions.items
                .filter((item) => item.enabled)
                .sort((first, second) => first.order - second.order)
                .map((item) => (
                  <HomepageBrowseCard
                    key={`${item.title}-${item.href}`}
                    href={item.href}
                    title={item.title}
                    description={item.description}
                    image={item.image}
                    variant="type"
                  />
                ))}
            </div>
          </div>
        </SectionShell>
      ) : null}

      {content.featuredUses.enabled && featuredUses.length > 0 ? (
        <SectionShell className="py-8 sm:py-10 lg:py-20">
          <div className="tr-container">
            <SectionHeader eyebrow={content.featuredUses.eyebrow} title={content.featuredUses.headline} cta={{ href: "/solutions", label: "View all" }} />
            <div className="mt-5 grid divide-y divide-line lg:mt-10 lg:grid-cols-2 lg:gap-5 lg:divide-y-0 xl:grid-cols-4">
              {featuredUses.map((useCase) => (
                <HomepageBrowseCard
                  key={useCase.slug}
                  href={`/solutions/${useCase.slug}`}
                  title={useCase.title}
                  description={useCase.shortDescription || useCase.description}
                  image={{
                    src: useCase.bannerImageUrl || useCase.imageUrl || "/uploads/products/no-photo-available.png",
                    alt: useCase.title
                  }}
                  variant="use-case"
                />
              ))}
            </div>
          </div>
        </SectionShell>
      ) : null}

      {productSections.length > 0 ? (
        <SectionShell className="hidden lg:block">
          <div className="tr-container grid gap-12">
            {productSections.map(({ category, products: categoryProducts }) => (
              <div key={category.slug}>
                <SectionHeader
                  eyebrow={category.eyebrow}
                  title={category.title}
                  body={category.buyerIntent}
                  cta={{ href: getCategoryHref(category.slug), label: "View all" }}
                />
                <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.slug} product={product} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {content.multilink.enabled && isHostedPurchaseOptionEnabled() ? (
        <SectionShell tone="soft" className="py-8 sm:py-10 lg:py-20">
          <div className="tr-container grid gap-5 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-10">
            <MarketingVisual content={content.multilink} />
            <MarketingCopy eyebrow={content.multilink.eyebrow} headline={content.multilink.headline} body={content.multilink.body} cta={content.multilink.cta} />
          </div>
        </SectionShell>
      ) : null}

      {content.howItWorks.enabled ? <HowItWorks content={content.howItWorks} /> : null}

      {content.customBranding.enabled ? (
        <SectionShell className="py-8 sm:py-10 lg:py-20">
          <div className="tr-container grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
            <MarketingCopy
              eyebrow={content.customBranding.eyebrow}
              headline={content.customBranding.headline}
              body={content.customBranding.body}
              cta={content.customBranding.cta}
              bullets={content.customBranding.bullets}
            />
            <div className="relative h-[240px] sm:h-[360px] lg:h-auto lg:min-h-[700px]">
              <Image
                src={optimizedUploadSrc(content.customBranding.image.src, 1200)}
                alt={content.customBranding.image.alt}
                fill
                unoptimized
                className="object-contain object-center mix-blend-multiply"
                sizes="(min-width: 1024px) 54vw, 100vw"
              />
            </div>
          </div>
        </SectionShell>
      ) : null}

      {faqs.length > 0 ? (
        <SectionShell tone="soft" className="py-8 sm:py-10 lg:py-20">
          <div className="tr-container">
            <SectionHeader align="center" eyebrow="FAQ" title="Answers before you buy." />
            <FaqList faqs={faqs} />
          </div>
        </SectionShell>
      ) : null}

      {content.finalCta.enabled ? (
        <SectionShell spacing="default" className="py-8 sm:py-10 lg:py-20">
          <div className="tr-container text-center">
            <p className="tr-eyebrow">{content.finalCta.eyebrow}</p>
            <h2 className="tr-section-title mx-auto mt-3 max-w-[860px] lg:mt-5">
              {content.finalCta.headline}
            </h2>
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:gap-5 lg:mt-9">
              <Link href={content.finalCta.primaryCta.href} className="tr-button-primary px-7">
                {content.finalCta.primaryCta.label}
              </Link>
              {content.finalCta.secondaryCta ? (
                <Link href={content.finalCta.secondaryCta.href} className="tr-editorial-link">
                  {content.finalCta.secondaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </SectionShell>
      ) : null}
    </main>
  );
}

function mergeFeaturedUses<T extends { slug: string; bannerImageUrl?: string; imageUrl?: string }>(configured: T[], fallback: T[]) {
  const merged = new Map<string, T>();

  for (const item of configured.filter((useCase) => Boolean(useCase.bannerImageUrl || useCase.imageUrl))) {
    merged.set(item.slug, item);
  }

  for (const item of fallback) {
    if (!merged.has(item.slug)) {
      merged.set(item.slug, item);
    }
  }

  return Array.from(merged.values());
}

function getCategoryHref(slug: string) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}

function MarketingCopy({
  eyebrow,
  headline,
  body,
  cta,
  bullets = []
}: {
  eyebrow: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  bullets?: string[];
}) {
  return (
    <div className="max-w-[610px]">
      <p className="tr-eyebrow">{eyebrow}</p>
      <h2 className="tr-section-title mt-3 lg:mt-5">{headline}</h2>
      <p className="tr-body mt-3 text-lg sm:text-xl lg:mt-5">{body}</p>
      {bullets.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 lg:mt-7">
          {bullets.map((bullet) => (
            <span key={bullet} className="tr-pill-neutral">{bullet}</span>
          ))}
        </div>
      ) : null}
      <Link href={cta.href} className="tr-editorial-link mt-4 text-base lg:mt-9">
        {cta.label}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}

function MarketingVisual({ content }: { content: { image: { src: string; alt: string }; bullets: string[] } }) {
  return (
    <div className="relative h-[240px] overflow-hidden sm:h-[360px] lg:tr-premium-surface lg:h-auto lg:min-h-[680px]">
      <div className="absolute inset-0 lg:inset-y-8 lg:left-[-12%] lg:right-auto lg:w-[66%]">
        <Image src={optimizedUploadSrc(content.image.src, 1200)} alt={content.image.alt} fill unoptimized className="object-contain object-center mix-blend-multiply" sizes="(min-width: 1024px) 34vw, 58vw" />
      </div>
      <div className="absolute right-10 top-16 hidden w-[48%] max-w-[320px] rounded-[var(--tr-radius-feature)] bg-white p-5 shadow-[var(--tr-shadow-elevated)] ring-1 ring-black/[0.04] lg:block">
        <div className="rounded-[var(--tr-radius-card)] bg-soft p-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-sm font-semibold text-white">TR</div>
          <p className="mt-4 text-center text-base font-semibold text-ink">Tap Rater Page</p>
          <p className="mt-1 text-center text-xs font-semibold text-muted">Tap or scan for important links</p>
          <div className="mt-5 grid gap-3">
            {content.bullets.slice(0, 6).map((button) => (
              <span key={button} className="rounded-[var(--tr-radius-control)] border border-line bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm">
                {button}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="absolute bottom-8 left-8 hidden max-w-[270px] text-sm font-semibold leading-6 text-muted lg:block">
        One physical stand opens one editable branded page.
      </p>
    </div>
  );
}

function HowItWorks({ content }: { content: HomepageHowItWorksContent }) {
  const icons = { shop: ShoppingBag, link: Link2, truck: Truck };

  return (
    <SectionShell className="py-8 sm:py-10 lg:py-20">
      <div className="tr-container">
        <SectionHeader align="center" eyebrow={content.eyebrow} title={content.headline} />
        <div className="mt-5 grid md:grid-cols-3 md:gap-5 lg:mt-10">
          {content.steps
            .slice()
            .sort((first, second) => first.order - second.order)
            .map((step, index) => {
              const Icon = icons[step.icon];
              return (
                <ProcessStepCard key={step.title} description={step.description} icon={Icon} index={index} title={step.title} compactOnMobile />
              );
            })}
        </div>
      </div>
    </SectionShell>
  );
}
