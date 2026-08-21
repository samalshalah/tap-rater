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
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.45fr] lg:items-end lg:px-8">
          <div>
            <Link href="/solutions" className="text-sm font-semibold text-brand">All business uses</Link>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Shop by use</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-4xl">{businessUse.title}</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">
              {businessUse.shortDescription || businessUse.description}
            </p>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-[#fafafa] lg:block">
            <Image src={heroImage} alt={businessUse.title} fill unoptimized className="object-cover" />
          </div>
        </div>
      </section>

      {businessUse.longContent ? (
        <section className="border-b border-line bg-[#f7f8fa]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="max-w-3xl whitespace-pre-line text-sm leading-7 text-muted">{businessUse.longContent}</div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{assignedProducts.length} stands</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Recommended stands</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Each product keeps Standard Direct and Branded + QR as setup options inside the product.
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
