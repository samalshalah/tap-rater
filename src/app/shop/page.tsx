import { ProductCard } from "@/components/product/product-card";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCatalogCategories } from "@/lib/products";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop NFC and QR Tabletop Stands",
  description:
    "Shop Tap Rater tabletop NFC and QR stands for reviews, social media, booking, menus, feedback, websites, and custom links.",
  alternates: { canonical: "/shop" }
};

export default async function ShopPage() {
  const products = await getStorefrontProducts();
  const categories = getCatalogCategories();

  return (
    <>
      <section className="border-b border-line bg-[#f5f5f7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">Tap Rater shop</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-ink md:text-5xl">
              Shop NFC and QR stands by customer action
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
              Choose a ready-made platform stand from $39, add logo and QR branding from $49, or create a custom direct stand for $49.
            </p>
          </div>
          <div className="grid gap-3 rounded-md border border-line bg-white p-5">
            <p className="text-sm font-bold uppercase text-ink">Launch pricing</p>
            <div className="grid gap-2 text-sm text-muted">
              <p><strong className="text-ink">Standard Direct:</strong> $39 one-time</p>
              <p><strong className="text-ink">Branded + QR Direct:</strong> $49 one-time</p>
              <p><strong className="text-ink">Custom Direct:</strong> $49 one-time</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">Shop by category</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Find the right stand faster</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Categories are organized around what customers are trying to do at the counter, table, desk, or reception area.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`} className="rounded-md border border-line bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <p className="text-xs font-bold uppercase text-brand">{category.eyebrow}</p>
              <h3 className="mt-2 text-lg font-black text-ink">{category.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{category.buyerIntent}</p>
              <p className="mt-4 text-sm font-bold text-ink">
                {products.filter((product) => product.categorySlug === category.slug).length} stands
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-[#f5f5f7]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3">
          <article className="rounded-md border border-line bg-white p-5">
            <p className="text-xs font-black uppercase text-brand">Simple pricing</p>
            <h2 className="mt-2 text-xl font-black text-ink">One-time physical stand purchases</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Today&apos;s saleable products are direct-link NFC and QR tabletop stands. No subscription is required.
            </p>
          </article>
          <article className="rounded-md border border-line bg-white p-5">
            <p className="text-xs font-black uppercase text-brand">Configured before cart</p>
            <h2 className="mt-2 text-xl font-black text-ink">Add the link and required branding first</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Branded and custom stands require setup details and proof approval before checkout.
            </p>
          </article>
          <article className="rounded-md border border-line bg-white p-5">
            <p className="text-xs font-black uppercase text-brand">Hosted pages later</p>
            <h2 className="mt-2 text-xl font-black text-ink">Multi-Link is request-only for now</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Hosted multi-link subscriptions are not shown as a main checkout product until the full lifecycle is approved.
            </p>
          </article>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-brand">All stands</p>
              <h2 className="mt-2 text-3xl font-black text-ink">Tap Rater catalog</h2>
            </div>
            <p className="text-sm font-semibold text-muted">{products.length} stands available</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
