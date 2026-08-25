import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Rater Pricing",
  description: "Simple launch pricing for Tap Rater physical NFC and QR tabletop stands."
};

const prices = [
  ["Standard Direct", "$39", "One-time. QR and NFC pointed directly to one destination link.", "/shop"],
  ["DIRECT mode", "No account", "No hosted page, activation step, customer account, or subscription is required.", "/shop"],
  ["Custom request", "Request", "For custom printed stand work that needs review before checkout or printing.", "/contact-us"]
];

export default function PricingPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="tr-eyebrow">Pricing</p>
          <h1 className="tr-page-title mt-4 max-w-3xl">Simple pricing for direct stands.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Buy ready stands from the shop. Standard Direct includes QR and NFC direct to one link as a one-time physical product purchase.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          {prices.map(([title, price, body, href]) => (
            <article key={title} className="flex min-h-[260px] flex-col rounded-[18px] border border-line bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-ink">{title}</h2>
              <p className="mt-5 text-2xl font-semibold text-ink">{price}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              <Link href={href} className="mt-auto inline-flex min-h-11 w-fit items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand">
                View options
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
