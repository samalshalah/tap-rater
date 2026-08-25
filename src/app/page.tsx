import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Link2, ShoppingBag, Truck } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { FaqList } from "@/components/storefront/faq-list";
import { ProcessStepCard } from "@/components/storefront/process-step-card";
import { VisualCard } from "@/components/storefront/visual-card";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCatalogCategories } from "@/lib/products";
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

  return (
    <main className="bg-white text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      {content.hero.enabled ? (
        <section className="bg-white">
          <div className="tr-container grid gap-6 pb-10 pt-8 sm:pb-14 sm:pt-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:pb-16 lg:pt-12">
            <div className="max-w-[660px] lg:pt-8">
              <p className="tr-eyebrow">{content.hero.eyebrow}</p>
              <h1 className="mt-5 text-[2.55rem] font-semibold leading-[1.05] text-[#111317] sm:text-[3.15rem] lg:text-[3.25rem]">
                {content.hero.headline}
              </h1>
              <p className="mt-6 max-w-[560px] text-lg font-medium leading-8 text-[#5f686f] sm:text-xl">{content.hero.body}</p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
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
                <div className="mt-6 flex flex-wrap gap-2">
                  {content.hero.proofPoints.map((point) => (
                    <span key={point} className="tr-pill-neutral bg-[#f4f5f5] text-[#4e575d]">
                      {point}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative min-h-[320px] overflow-hidden sm:min-h-[470px] lg:min-h-[560px]">
              <Image
                src={content.hero.image.src}
                alt={content.hero.image.alt}
                fill
                priority
                unoptimized
                className="object-contain object-center mix-blend-multiply scale-[0.94] sm:scale-[0.98] lg:scale-[1.02]"
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
            </div>
          </div>
        </section>
      ) : null}

      {content.actions.enabled ? (
        <section className="bg-[#f7f8f8] py-12 sm:py-16 lg:py-20">
          <div className="tr-container">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="tr-eyebrow">{content.actions.eyebrow}</p>
                <h2 className="mt-4 max-w-[780px] text-[2rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.65rem]">
                  {content.actions.headline}
                </h2>
              </div>
              <Link href="/shop" className="tr-editorial-link">
                Shop All Stands
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {content.actions.items
                .filter((item) => item.enabled)
                .sort((first, second) => first.order - second.order)
                .map((item) => (
                  <VisualCard
                    key={`${item.title}-${item.href}`}
                    href={item.href}
                    title={item.title}
                    description={item.description}
                    image={item.image}
                    cta="Learn more"
                    variant="type"
                  />
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {content.featuredUses.enabled && featuredUses.length > 0 ? (
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="tr-container">
            <div className="mx-auto max-w-4xl text-center">
              <p className="tr-eyebrow">{content.featuredUses.eyebrow}</p>
              <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.75rem]">
                {content.featuredUses.headline}
              </h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredUses.map((useCase) => (
                <VisualCard
                  key={useCase.slug}
                  href={`/solutions/${useCase.slug}`}
                  title={useCase.title}
                  description={useCase.shortDescription || useCase.description}
                  image={{
                    src: useCase.bannerImageUrl || useCase.imageUrl || "/uploads/products/no-photo-available.png",
                    alt: useCase.title
                  }}
                  imageFit="cover"
                  variant="use-case"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {productSections.length > 0 ? (
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="tr-container grid gap-12">
            {productSections.map(({ category, products: categoryProducts }) => (
              <div key={category.slug}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="tr-eyebrow">{category.eyebrow}</p>
                    <h2 className="mt-3 text-[2rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.55rem]">
                      {category.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted">{category.buyerIntent}</p>
                  </div>
                  <Link href={getCategoryHref(category.slug)} className="tr-editorial-link">
                    View all
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.slug} product={product} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.multilink.enabled ? (
        <section className="bg-[#f7f8f8] py-12 sm:py-16 lg:py-20">
          <div className="tr-container grid gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-center">
            <MarketingVisual content={content.multilink} />
            <MarketingCopy eyebrow={content.multilink.eyebrow} headline={content.multilink.headline} body={content.multilink.body} cta={content.multilink.cta} />
          </div>
        </section>
      ) : null}

      {content.howItWorks.enabled ? <HowItWorks content={content.howItWorks} /> : null}

      {content.customBranding.enabled ? (
        <section className="bg-white py-12 sm:py-16 lg:py-20">
          <div className="tr-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <MarketingCopy
              eyebrow={content.customBranding.eyebrow}
              headline={content.customBranding.headline}
              body={content.customBranding.body}
              cta={content.customBranding.cta}
              bullets={content.customBranding.bullets}
            />
            <div className="relative min-h-[560px] sm:min-h-[700px]">
              <Image
                src={content.customBranding.image.src}
                alt={content.customBranding.image.alt}
                fill
                unoptimized
                className="object-contain object-center mix-blend-multiply"
                sizes="(min-width: 1024px) 54vw, 100vw"
              />
            </div>
          </div>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="bg-[#f7f8f8] py-12 sm:py-16 lg:py-20">
          <div className="tr-container">
            <div className="mx-auto max-w-3xl text-center">
              <p className="tr-eyebrow">FAQ</p>
              <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.65rem]">Answers before you buy.</h2>
            </div>
            <FaqList faqs={faqs} />
          </div>
        </section>
      ) : null}

      {content.finalCta.enabled ? (
        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="tr-container text-center">
            <p className="tr-eyebrow">{content.finalCta.eyebrow}</p>
            <h2 className="mx-auto mt-5 max-w-[860px] text-[2.15rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.85rem]">
              {content.finalCta.headline}
            </h2>
            <div className="mt-9 flex flex-wrap justify-center gap-5">
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
        </section>
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
      <h2 className="mt-6 text-[2.1rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.75rem]">{headline}</h2>
      <p className="mt-6 text-xl font-medium leading-8 text-[#5d666d]">{body}</p>
      {bullets.length > 0 ? (
        <div className="mt-7 flex flex-wrap gap-2">
          {bullets.map((bullet) => (
            <span key={bullet} className="tr-pill-neutral">{bullet}</span>
          ))}
        </div>
      ) : null}
      <Link href={cta.href} className="mt-9 tr-editorial-link text-base">
        {cta.label}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}

function MarketingVisual({ content }: { content: { image: { src: string; alt: string }; bullets: string[] } }) {
  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-[38px] bg-white sm:min-h-[700px]">
      <div className="absolute inset-y-8 left-0 w-[58%] sm:w-[60%] lg:left-[-12%] lg:w-[66%]">
        <Image src={content.image.src} alt={content.image.alt} fill unoptimized className="object-contain object-center mix-blend-multiply" sizes="(min-width: 1024px) 34vw, 58vw" />
      </div>
      <div className="absolute right-5 top-12 w-[54%] max-w-[320px] rounded-[34px] bg-white p-5 shadow-[0_22px_60px_rgba(16,32,30,0.14)] ring-1 ring-black/[0.04] sm:right-10 sm:top-16 sm:w-[48%]">
        <div className="rounded-[26px] bg-[#fbfcfc] p-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-sm font-semibold text-white">TR</div>
          <p className="mt-4 text-center text-base font-semibold text-ink">Tap Rater Page</p>
          <p className="mt-1 text-center text-xs font-semibold text-muted">Tap or scan for important links</p>
          <div className="mt-5 grid gap-3">
            {content.bullets.slice(0, 6).map((button) => (
              <span key={button} className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-sm">
                {button}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="absolute bottom-8 left-8 max-w-[270px] text-sm font-semibold leading-6 text-muted">
        One physical stand opens one editable branded page.
      </p>
    </div>
  );
}

function HowItWorks({ content }: { content: HomepageHowItWorksContent }) {
  const icons = { shop: ShoppingBag, link: Link2, truck: Truck };

  return (
    <section className="bg-white py-14 sm:py-18 lg:py-24">
      <div className="tr-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="tr-eyebrow">{content.eyebrow}</p>
          <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] text-[#111317] sm:text-[2.65rem]">{content.headline}</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {content.steps
            .slice()
            .sort((first, second) => first.order - second.order)
            .map((step, index) => {
              const Icon = icons[step.icon];
              return (
                <ProcessStepCard key={step.title} description={step.description} icon={Icon} index={index} title={step.title} />
              );
            })}
        </div>
      </div>
    </section>
  );
}
