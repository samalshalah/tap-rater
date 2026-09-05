import Link from "next/link";
import type { Metadata } from "next";
import { ProcessStepCard } from "@/components/storefront/process-step-card";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "How Tap Rater Works",
  description: "Choose a stand, add your link, and get a Tap Rater stand ready for your counter.",
  alternates: { canonical: "/how-it-works" }
};

const steps = [
  ["Choose your stand", "Pick a review, menu, booking, social, feedback, or website stand from the active shop catalog."],
  ["Add your link", "Standard Direct needs one destination URL and goes straight to setup review."],
  ["Confirm NFC setup", "The NFC tap target uses the customer-provided URL. Branded + QR stands also generate a matching QR code."],
  ["Checkout", "Tap Rater collects the order and shipping details before preparing your stand."]
];

const flows = [
  ["Standard Direct", "Choose stand → add link → cart → checkout", "NFC direct to your destination."],
  ["No hosted activation", "No account → no hosted page → no subscription", "DIRECT products do not require a Tap Rater account or activation workflow."]
];

export default function HowItWorksPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="How it works"
        title="From product page to counter-ready stand."
        body="Direct stands are built for fast checkout: choose the stand, add one destination URL, and complete checkout."
        image={{
          src: "/uploads/products/taprater-stands/yelp/yelp-standard-angled.png",
          alt: "Tap Rater review stand"
        }}
      />

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Four steps"
            title="Choose, connect, confirm, and receive."
            body="The buying path stays simple for Standard Direct NFC stands."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], index) => (
            <ProcessStepCard key={title} description={body} index={index} title={title} />
          ))}
          </div>
          <div className="my-6 grid gap-4 md:grid-cols-2">
            {flows.map(([title, body, note]) => (
              <article key={title} className="tr-card p-5">
                <h2 className="text-lg font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-sm font-semibold text-muted">{body}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
              </article>
            ))}
          </div>
          <Link href="/shop" className="tr-button-primary">
            Start shopping
          </Link>
        </div>
      </SectionShell>
    </main>
  );
}
