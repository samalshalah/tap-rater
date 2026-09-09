import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { catalogCategories, type CatalogCategorySlug } from "@/data/migrated-products";
import { getPublicStandTypeBySlug, getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProductsByCategory } from "@/lib/product-repository";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getCategoryVisual } from "@/lib/storefront-visuals";
import { withoutSiteTitleSuffix } from "@/lib/metadata-title";
import { getCategoryHref } from "@/lib/category-routes";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
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

  return {
    title: withoutSiteTitleSuffix(standType?.seoTitle || category.seoTitle),
    description: standType?.seoDescription || category.seoDescription,
    alternates: {
      canonical: getCategoryHref(category.slug)
    },
    openGraph: {
      title: standType?.seoTitle || category.seoTitle,
      description: standType?.seoDescription || category.seoDescription,
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

  if (slug === "website-links") {
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
  const visual = getCategoryVisual(category);
  const heroImage = activeStandType.bannerImageUrl || activeStandType.imageUrl || visual.src;
  const hasSingleProduct = products.length === 1;
  const productGridClassName =
    hasSingleProduct
      ? "mt-8 grid max-w-[520px] gap-5 md:max-w-[600px]"
      : "mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  const title = activeStandType.title || category.title;
  const description = activeStandType.shortDescription || activeStandType.description || category.description;
  const buyerIntent = activeStandType.buyerIntent || category.buyerIntent;

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        backLink={{ href: "/shop", label: "Shop all stands" }}
        eyebrow={category.eyebrow}
        title={title}
        body={
          <>
            <p>{description}</p>
            {activeStandType.longContent ? <div className="tr-body-sm mt-5 whitespace-pre-line">{activeStandType.longContent}</div> : null}
            {products.some(productSupportsMultiLink) ? (
              <p className="tr-body-sm mt-4">
                Optional hosted Multi-Link costs {formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page, in addition to the physical stand price. Includes up to {hostedMultiLinkServiceAddon.maxLinks} editable links.
              </p>
            ) : null}
          </>
        }
        image={{
          src: heroImage,
          alt: activeStandType.title || visual.alt
        }}
      />

      <SectionShell tone="soft" spacing={hasSingleProduct ? "compact" : "default"}>
        <div className="tr-container">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">{products.length} stands</p>
            <h2 className="tr-section-title mt-2">Shop {title.toLowerCase()}</h2>
          </div>
          <p className="tr-body-sm max-w-xl">{buyerIntent}</p>
        </div>
        <div className={hasSingleProduct ? `${productGridClassName} [&_>_a>div:first-child]:h-72 [&_>_a>div:first-child]:sm:h-80` : productGridClassName}>
          {products.length > 0 ? (
            products.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : (
            <div className="tr-panel-muted p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
              Products are being prepared.
            </div>
          )}
        </div>
        </div>
      </SectionShell>
    </main>
  );
}

function categoryToStandTypeSlug(slug: CatalogCategorySlug) {
  const map: Record<CatalogCategorySlug, string> = {
    reviews: "review-stands",
    "social-media": "social-media-stands",
    appointments: "appointment-reservation-stands",
    menu: "menu-info-stands",
    feedback: "feedback-survey-stands",
    "website-links": "website-link-stands",
    "custom-stands": "custom-stands"
  };

  return map[slug];
}
