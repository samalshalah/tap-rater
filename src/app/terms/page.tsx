import Link from "next/link";
import type { Metadata } from "next";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Terms",
  description: "Basic Tap Rater terms for NFC stands, destination links, logo rights, order review, and product use.",
  alternates: { canonical: "/terms" }
};

const sections = [
  ["Google Reviews subscription", "Google Reviews is billed monthly per location and renews automatically until canceled. Physical stands are a separate one-time purchase. Review the total before payment. You can cancel from Account → Subscription at any time. When you cancel, the service keeps working until the end of the month you already paid for, then it stops and is not charged again. Payments are not refunded for unused days. When the service stops, your Google locations are disconnected so they can be connected again later, and imported reviews and drafts stay available for 30 days. Need to end sooner or have a billing question? Contact support and we'll look at it case by case."],
  ["Reply allowance and posting", "Each subscribed location includes 1,000 AI reply drafts per month. Allowances reset monthly in New York time. Regenerations and failed AI attempts count toward the allowance. Unused drafts do not roll over, and extra usage is not charged automatically. Replies are posted to Google only when you submit them, or automatically for 4–5-star reviews if you turn on autopilot. You are responsible for the replies posted for your business; check AI drafts for accuracy and tone."],
  ["Product use", "Tap Rater sells custom NFC and QR stands for local businesses. Every new stand includes the customer logo, business name, and QR code. Previously purchased Standard Direct stands continue to use NFC with their destination link."],
  ["Destination links", "You are responsible for providing an accurate destination URL. Tap Rater may review links for order purposes, but you should test the destination before placing an order and before using the stand with customers."],
  ["Uploaded logos and content", "You are responsible for having the rights to use any logo, image, brand name, business name, or other content you upload or provide. Tap Rater may reject inappropriate, invalid, low-quality, or order-incompatible content."],
  ["Branded artwork", "For Branded + QR orders, you are responsible for entering the correct business name, destination link, and uploaded logo before checkout. Tap Rater reviews artwork compatibility before production."],
  ["NFC and QR behavior", "NFC and QR destinations depend on the URL provided, device compatibility, internet access, and third-party platforms. Tap Rater does not control Google, Yelp, Facebook, booking platforms, menu platforms, social networks, or any destination website."],
  ["No guaranteed results", "Tap Rater stands are designed to make it easier for customers to open your link. We do not guarantee reviews, bookings, sales, followers, feedback volume, ratings, platform approvals, or business results."],
  ["Support", "For order, link, or setup questions, contact Tap Rater through support."]
];

export default function TermsPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Terms"
        title="Simple terms for Tap Rater orders."
        body="These terms explain the customer responsibilities that matter for NFC stands, QR codes, destination links, and uploaded brand assets."
      />

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow grid gap-4">
          {sections.map(([title, body]) => (
            <article key={title} className="tr-card p-5">
              <h2 className="tr-card-title">{title}</h2>
              <p className="tr-body-sm mt-3">{body}</p>
            </article>
          ))}
          <div className="tr-card p-5">
            <p className="tr-body-sm mb-3">
              Address suggestions are provided by Google Maps Platform under the <a href="https://maps.google.com/help/terms_maps/" className="font-semibold text-brand hover:text-brand-dark">Google Maps Terms of Service</a>. Suggestions do not verify delivery eligibility. Review your shipping address before placing an order.
            </p>
            <p className="tr-body-sm">
              Questions before ordering? <Link href="/support" className="font-semibold text-brand hover:text-brand-dark">Contact support</Link>.
            </p>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
