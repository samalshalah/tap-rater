import Link from "next/link";
import type { Metadata } from "next";
import { getCatalogCategories } from "@/lib/products";

export const metadata: Metadata = {
  title: "Tap Rater Solutions by Business Use",
  description: "Shop Tap Rater NFC and QR tabletop stands by use: reviews, menus, booking, social media, feedback, website links, and custom stands."
};

export default function SolutionsPage() {
  const categories = getCatalogCategories();

  return (
    <main className="bg-[#f5f5f7]">
      <section className="mx-auto max-w-7xl px-4 py-14">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Solutions</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-ink">Choose stands by what customers need to do.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Start with the customer action, then choose the stand setup. Each solution leads to a clear physical product instead of an unfinished platform flow.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`} className="rounded-md border border-line bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-xs font-black uppercase text-brand">{category.eyebrow}</p>
              <h2 className="mt-3 text-xl font-black text-ink">{category.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{category.buyerIntent}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
