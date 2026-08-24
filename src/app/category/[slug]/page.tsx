import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { catalogCategories, type CatalogCategorySlug } from "@/data/migrated-products";
import { getPublicStandTypeBySlug, getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProductsByCategory } from "@/lib/product-repository";
import { getCategoryBySlug } from "@/lib/products";
import { getCategoryVisual } from "@/lib/storefront-visuals";

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
    title: standType?.seoTitle || category.seoTitle.replace(" | Tap Rater", ""),
    description: standType?.seoDescription || category.seoDescription,
    alternates: {
      canonical: getCategoryHref(category.slug)
    },
    openGraph: {
      title: standType?.seoTitle || category.seoTitle,
      description: standType?.seoDescription || category.seoDescription,
      url: getCategoryHref(category.slug)
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
    <main className="bg-white text-ink">
      <section className="bg-white">
        <div className="tr-container grid gap-8 py-12 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:py-16">
          <div className="lg:pr-6">
            <Link href="/shop" className="text-sm font-semibold text-brand">
              Shop all stands
            </Link>
            <p className="tr-eyebrow mt-6">{category.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.2rem]">{title}</h1>
            <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-[#5f686f]">{description}</p>
            {activeStandType.longContent ? <div className="mt-6 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted">{activeStandType.longContent}</div> : null}
          </div>
          <div className="tr-page-hero-media relative aspect-[4/3] overflow-hidden rounded-[34px] bg-[#f7f8f8] shadow-[0_22px_70px_rgba(16,32,30,0.08)]">
            <Image src={heroImage} alt={activeStandType.title || visual.alt} fill unoptimized className="object-contain p-7 mix-blend-multiply sm:p-10" />
          </div>
        </div>
      </section>

      <section className={hasSingleProduct ? "tr-container py-10 lg:py-12" : "tr-container py-12 lg:py-16"}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">{products.length} stands</p>
            <h2 className="mt-2 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.35rem]">Shop {title.toLowerCase()}</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">{buyerIntent}</p>
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
      </section>
    </main>
  );
}

function getCategoryHref(slug: CatalogCategorySlug) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
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
