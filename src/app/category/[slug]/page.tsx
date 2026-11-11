import { MultiLinkDemoVisual } from "@/components/storefront/multi-link-demo-visual";
import { getStandTypeHeroImage } from "@/lib/stand-type-image";
import { getCategoryVisual } from "@/lib/storefront-visuals";
import { CategoryBuyingGuide } from "@/components/storefront/category-buying-guide";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { GoogleReviewStandGuideLinks } from "@/components/storefront/google-review-stand-guide-links";
import { ProductCard } from "@/components/product/product-card";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { catalogCategories } from "@/data/migrated-products";
import { getPublicStandTypeBySlug, getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProductsByCategory } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { withoutSiteTitleSuffix } from "@/lib/metadata-title";
import { categoryToStandTypeSlug, getCategoryHref } from "@/lib/category-routes";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { multiLinkDemoImage } from "@/lib/marketing-images";
import { getBusinessUsePageCopy } from "@/lib/business-use-content";
import { lockedStandTypes } from "@/lib/catalog-architecture";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

const legacyMultiLinkCopy = {
  title: "Multi-Link Stand",
  intro: "Add a hosted Multi-Link page to compatible NFC and QR stands.",
  description: "Shop NFC and QR stands that can add a hosted Multi-Link page with up to 10 customer links."
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  const standType = category ? await getPublicStandTypeBySlug(categoryToStandTypeSlug(category.slug)) : undefined;

  if (!category) {
    return {
      title: "Category Not Found"
    };
  }

  const products = await getStorefrontProductsByCategory(category.slug);
  const isMultiLinkCategory = category.slug === "website-links";
  const configuredTitle = standType?.seoTitle && withoutSiteTitleSuffix(standType.seoTitle);
  const seoTitle = isMultiLinkCategory && configuredTitle === legacyMultiLinkCopy.title
    ? category.seoTitle
    : standType?.seoTitle || category.seoTitle;
  const seoDescription = isMultiLinkCategory && standType?.seoDescription === legacyMultiLinkCopy.description
    ? category.seoDescription
    : standType?.seoDescription || category.seoDescription;

  return {
    title: withoutSiteTitleSuffix(seoTitle),
    robots: !standType || products.length === 0 ? { index: false, follow: true } : undefined,
    description: seoDescription,
    alternates: {
      canonical: getCategoryHref(category.slug)
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: getCategoryHref(category.slug),
      images: [{
        url: standType?.bannerImageUrl || standType?.imageUrl || getCategoryVisual(category).src,
        alt: standType?.title || category.title
      }]
    }
  };
}

export function generateStaticParams() {
  return catalogCategories.flatMap((category) => [category.slug, ...(category.aliases ?? [])].map((slug) => ({ slug })));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  if (`/category/${slug}` !== getCategoryHref(category.slug)) {
    permanentRedirect(getCategoryHref(category.slug));
  }

  const [products, publicStandTypes] = await Promise.all([
    getStorefrontProductsByCategory(category.slug),
    getPublicStandTypes()
  ]);
  const activeStandType = publicStandTypes.find((standType) => standType.slug === categoryToStandTypeSlug(category.slug));
  if (!activeStandType) {
    notFound();
  }
  const heroImage = getStandTypeHeroImage(category, activeStandType, products);
  const isReviewCategory = category.slug === "reviews";
  const isMultiLinkCategory = category.slug === "website-links";
  const defaultStandType = lockedStandTypes.find((standType) => standType.slug === activeStandType.slug);
  const standTypeDescription = (activeStandType.shortDescription || activeStandType.description)?.trim();
  // Refresh original catalog copy while preserving merchant-authored headings and descriptions.
  const title = !activeStandType.title || activeStandType.title === defaultStandType?.title
    ? withoutSiteTitleSuffix(category.seoTitle)
    : activeStandType.title;
  const usesDefaultDescription = !standTypeDescription || standTypeDescription === defaultStandType?.description
    || (isMultiLinkCategory && standTypeDescription === legacyMultiLinkCopy.intro);
  const description = usesDefaultDescription
    ? category.description
    : standTypeDescription;
  const copy = getBusinessUsePageCopy({ description, longContent: activeStandType.longContent });
  const buyerIntent = activeStandType.buyerIntent || category.buyerIntent;
  const optionsId = isReviewCategory ? "review-stand-options" : "stand-options";
  const hasMultiLinkOptions = products.some(productSupportsMultiLink);

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={breadcrumbJsonLd([{ name: "Shop all stands", href: "/shop" }, { name: title, href: getCategoryHref(category.slug) }])} />
      <PageHero
        spacing="compact"
        backLink={{ href: "/shop", label: "Shop all stands" }}
        eyebrow={category.eyebrow}
        title={title}
        cta={products.length > 0 ? { href: `#${optionsId}`, label: isReviewCategory ? "Browse all review stands" : "Browse all stand options" } : undefined}
        body={copy.intro}
        media={isMultiLinkCategory && (!activeStandType.bannerImageUrl || heroImage.src === multiLinkDemoImage.src) ? <MultiLinkDemoVisual /> : undefined}
        image={{ ...heroImage, priority: true }}
      />

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">{products.length} {products.length === 1 ? "stand" : "stands"}</p>
            <h2 id={optionsId} className="tr-section-title mt-2 scroll-mt-24">
              {isReviewCategory ? "Shop NFC review stands by platform" : "Shop all stand options"}
            </h2>
          </div>
          <p className="tr-body-sm max-w-xl">{buyerIntent}</p>
        </div>
        {copy.body ? <p className="tr-body-sm mt-4 max-w-3xl whitespace-pre-line">{copy.body}</p> : null}
        {hasMultiLinkOptions ? (
          <p className="tr-body-sm mt-4 max-w-3xl">
            Optional hosted Multi-Link costs {formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page, in addition to the physical stand price. Includes up to {hostedMultiLinkServiceAddon.maxLinks} editable links.
          </p>
        ) : null}
        <div className="tr-product-grid mt-6">
          {products.length > 0 ? (
            products.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : (
            <div className="col-span-full py-6 text-sm font-semibold text-muted">
              Products are being prepared.
            </div>
          )}
        </div>
        </div>
      </SectionShell>
      <CategoryBuyingGuide slug={category.slug} products={products} />
      {isReviewCategory ? (
        <SectionShell spacing="compact">
          <div className="tr-container">
            <h2 className="tr-section-title">Set up a Google review stand for your business</h2>
            <GoogleReviewStandGuideLinks />
          </div>
        </SectionShell>
      ) : null}
    </main>
  );
}
