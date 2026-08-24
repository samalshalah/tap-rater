import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
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

  return (
    <main className="bg-white text-ink">
      <section className="bg-white">
        <div className="tr-container grid gap-8 py-12 lg:grid-cols-[1fr_0.62fr] lg:items-center lg:py-16">
          <div>
            <Link href="/solutions" className="text-sm font-semibold text-brand">All business uses</Link>
            <p className="tr-eyebrow mt-6">Shop by use</p>
            <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.2rem]">{businessUse.title}</h1>
            <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-[#5f686f]">
              {businessUse.shortDescription || businessUse.description}
            </p>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-[34px] bg-[#f7f8f8] shadow-[0_22px_70px_rgba(16,32,30,0.08)] lg:block">
            <Image src={heroImage} alt={businessUse.title} fill unoptimized className="object-cover" />
          </div>
        </div>
      </section>

      {businessUse.longContent ? (
        <section className="border-y border-line bg-[#f7f8f8]">
          <div className="tr-container py-8">
            <div className="max-w-3xl whitespace-pre-line text-sm leading-7 text-muted">{businessUse.longContent}</div>
          </div>
        </section>
      ) : null}

      <section className="tr-container py-12 lg:py-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">{assignedProducts.length} stands</p>
            <h2 className="mt-2 text-[1.95rem] font-semibold leading-tight text-ink md:text-[2.35rem]">Recommended stands</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Each product uses Standard Direct setup with one customer destination URL.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assignedProducts.length > 0 ? (
            assignedProducts.map((product) => <ProductCard key={product.slug} product={product} />)
          ) : (
            <div className="rounded-[18px] border border-line bg-[#f7f8fa] p-6 text-sm font-semibold text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
              Product recommendations are being prepared.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
