import Link from "next/link";
import type { Metadata } from "next";
import { SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Tap Rater Pricing",
  description: "Simple launch pricing for Tap Rater physical NFC and QR tabletop stands."
};

const prices = [
  ["Standard Direct", "$39", "One-time. QR and NFC pointed directly to one destination link.", "/shop"],
  ["DIRECT mode", "No account", "No hosted page, activation step, customer account, or subscription is required.", "/shop"],
  ["Custom request", "Request", "For custom stand work that needs review before checkout.", "/contact-us"]
];

export default function PricingPage() {
  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container">
          <p className="tr-eyebrow">Pricing</p>
          <h1 className="tr-page-title mt-4 max-w-3xl">Simple pricing for direct stands.</h1>
          <p className="tr-body mt-4 max-w-2xl">
            Buy ready stands from the shop. Standard Direct includes QR and NFC direct to one link as a one-time physical product purchase.
          </p>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container grid gap-4 md:grid-cols-3">
          {prices.map(([title, price, body, href]) => (
            <article key={title} className="tr-card flex min-h-[260px] flex-col p-5">
              <h2 className="tr-card-title text-xl">{title}</h2>
              <p className="mt-5 text-2xl font-semibold text-ink">{price}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              <Link href={href} className="tr-button-primary mt-auto w-fit">
                View options
              </Link>
            </article>
          ))}
        </div>
      </SectionShell>
    </main>
  );
}
