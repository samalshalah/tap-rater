import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Rater Pricing",
  description: "Simple launch pricing for Tap Rater physical NFC and QR tabletop stands."
};

const prices = [
  ["Standard Direct Stand", "$39", "One direct NFC destination link.", "/category/reviews"],
  ["Branded + QR Direct Stand", "$49", "Business name, uploaded logo, and printed QR code before checkout.", "/shop"],
  ["Custom Stand", "$49", "Custom headline or content with one direct link. Request help before custom checkout opens.", "/custom-stands"]
];

export default function PricingPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Pricing</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-ink md:text-5xl">Simple one-time stand pricing.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Start with a physical stand. Branded + QR setup uses the destination, uploaded logo, business name, and proof preview before checkout.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          {prices.map(([title, price, body, href]) => (
            <article key={title} className="flex min-h-[260px] flex-col rounded-[18px] border border-line bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-ink">{title}</h2>
              <p className="mt-5 text-3xl font-extrabold text-ink">{price}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              <Link href={href} className="mt-auto inline-flex min-h-11 w-fit items-center rounded-full bg-ink px-5 text-sm font-black text-white hover:bg-brand">
                View options
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
