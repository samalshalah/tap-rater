import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom NFC and QR Stands",
  description: "Request custom Tap Rater tabletop NFC and QR stand work for designs that do not fit the ready stand catalog."
};

export default function CustomStandsPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Custom stands</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-ink md:text-5xl">Need a stand outside the ready catalog?</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
              Custom printed stand requests are handled through support so the design, link, logo needs, and production path can be confirmed before checkout or printing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/support" className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-black text-white transition hover:bg-brand">
                Request a Custom Stand
              </Link>
              <Link href="/shop" className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-6 text-sm font-black text-ink transition hover:border-ink">
                Shop Ready Stands
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-line bg-white">
            <Image src="/uploads/products/business-google-white-stands-bundle.jpg" alt="Custom Tap Rater stands" fill unoptimized className="object-contain p-6" />
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            ["One direct link", "Use one approved destination such as a website, form, booking page, or custom URL."],
            ["Design review", "Custom requests are reviewed before printing so the final stand has an approved production direction."],
            ["Request-only", "Custom Direct is not a live checkout product yet. Use the ready stands when you want to buy now."]
          ].map(([title, body]) => (
            <article key={title} className="rounded-[18px] border border-line bg-white p-5">
              <h2 className="font-black text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
