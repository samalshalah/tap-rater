import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Rater Pricing",
  description: "Simple launch pricing for Tap Rater physical NFC and QR tabletop stands."
};

const prices = [
  ["Standard Direct Stand", "$39", "One direct NFC destination link."],
  ["Branded + QR Direct Stand", "$49", "Business name, logo, QR code, and one direct link."],
  ["Custom Direct Stand", "$49", "Custom headline or content with one direct link."]
];

export default function PricingPage() {
  return (
    <main className="bg-[#f5f5f7]">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Pricing</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-ink">Simple one-time stand pricing.</h1>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {prices.map(([title, price, body]) => (
            <article key={title} className="rounded-md border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-ink">{title}</h2>
              <p className="mt-4 text-4xl font-black text-brand">{price}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
        <Link href="/shop" className="mt-8 inline-flex rounded-md bg-ink px-6 py-4 text-sm font-black text-white transition hover:bg-brand">
          Shop stands
        </Link>
      </section>
    </main>
  );
}
