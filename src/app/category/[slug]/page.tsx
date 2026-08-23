import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { catalogCategories, type CatalogCategorySlug } from "@/data/migrated-products";
import { getPublicStandTypeBySlug, getPublicStandTypes } from "@/lib/admin-stand-types";
import { getStorefrontProductsByCategory } from "@/lib/product-repository";
import { getCatalogCategories, getCategoryBySlug } from "@/lib/products";
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
  const categories = getCatalogCategories().filter((item) => publicStandTypes.some((standType) => standType.slug === categoryToStandTypeSlug(item.slug)));
  const visual = getCategoryVisual(category);
  const heroImage = activeStandType.bannerImageUrl || activeStandType.imageUrl || visual.src;
  const title = activeStandType.title || category.title;
  const description = activeStandType.shortDescription || activeStandType.description || category.description;
  const buyerIntent = activeStandType.buyerIntent || category.buyerIntent;

  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.45fr] lg:items-end lg:px-8">
          <div>
            <Link href="/shop" className="text-sm font-semibold text-brand">
              Shop all stands
            </Link>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{category.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">{description}</p>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-[#fafafa] lg:block">
            <Image src={heroImage} alt={activeStandType.title || visual.alt} fill unoptimized className="object-contain p-6" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            <Link
              href="/shop"
              className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink"
            >
              All stands
            </Link>
            {categories.map((item) => (
              <Link
                key={item.slug}
                href={getCategoryHref(item.slug)}
                className={
                  item.slug === category.slug
                    ? "inline-flex min-h-9 shrink-0 items-center rounded-full bg-brand px-4 text-[13px] font-semibold text-white"
                    : "inline-flex min-h-9 shrink-0 items-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink"
                }
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{products.length} stands</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Shop {title.toLowerCase()}</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">{buyerIntent}</p>
        </div>
        {activeStandType.longContent ? <div className="mt-6 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted">{activeStandType.longContent}</div> : null}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.length > 0 ? (
            products.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : (
            <div className="rounded-[18px] border border-line bg-[#f7f8fa] p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
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
