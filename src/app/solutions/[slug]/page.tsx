import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getPublicBusinessUseBySlug, getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getStorefrontProducts } from "@/lib/product-repository";

type BusinessUsePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BusinessUsePageProps): Promise<Metadata> {
  const { slug } = await params;
  const businessUse = await getPublicBusinessUseBySlug(slug);
  if (!businessUse) {
    return { title: "Business Use Not Found" };
  }

  return {
    title: businessUse.seoTitle || `${businessUse.title} NFC Stands`,
    description: businessUse.seoDescription || businessUse.shortDescription || businessUse.description,
    alternates: { canonical: `/solutions/${businessUse.slug}` },
    openGraph: {
      title: businessUse.seoTitle || businessUse.title,
      description: businessUse.seoDescription || businessUse.shortDescription || businessUse.description,
      url: `/solutions/${businessUse.slug}`
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

  const assignedProducts = products.filter((product) => {
    return businessUse.productSlugs.includes(product.slug) || product.businessUseSlugs?.includes(businessUse.slug);
  });
  const heroImage = businessUse.bannerImageUrl || businessUse.imageUrl || "/uploads/products/no-photo-available.png";
  const hasSingleProduct = assignedProducts.length === 1;
  const productGridClassName =
    hasSingleProduct
      ? "mt-8 grid max-w-[520px] gap-5 md:max-w-[600px]"
      : "mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="hero">
        <div className="tr-container grid gap-8 lg:grid-cols-[0.82fr_1fr] lg:items-center">
          <div className="lg:pr-6">
            <Link href="/solutions" className="tr-editorial-link">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All business uses
            </Link>
            <p className="tr-eyebrow mt-6">Shop by use</p>
            <h1 className="tr-page-title mt-4 max-w-4xl">{businessUse.title}</h1>
            <p className="tr-body mt-5 max-w-3xl text-lg sm:text-xl">
              {businessUse.shortDescription || businessUse.description}
            </p>
            {businessUse.longContent ? (
              <div className="tr-body-sm mt-6 max-w-3xl whitespace-pre-line">{businessUse.longContent}</div>
            ) : null}
          </div>
          <div className="tr-premium-surface relative aspect-[4/3]">
            <Image src={heroImage} alt={businessUse.title} fill unoptimized className="object-cover" />
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing={hasSingleProduct ? "compact" : "default"}>
        <div className="tr-container">
          <SectionHeader
            eyebrow={`${assignedProducts.length} stands`}
            title="Recommended stands"
            body="Each product uses Standard Direct setup with one customer destination URL."
            cta={{ href: "/shop", label: "Shop all stands" }}
          />
        <div className={hasSingleProduct ? `${productGridClassName} [&_>_a>div:first-child]:h-72 [&_>_a>div:first-child]:sm:h-80` : productGridClassName}>
          {assignedProducts.length > 0 ? (
            assignedProducts.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : (
            <div className="tr-card p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
              Product recommendations are being prepared.
            </div>
          )}
        </div>
          <Link href="/solutions" className="tr-editorial-link mt-8">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to business uses
          </Link>
        </div>
      </SectionShell>
    </main>
  );
}
