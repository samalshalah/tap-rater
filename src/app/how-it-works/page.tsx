import { HowItWorksHeroVisual } from "@/components/storefront/multi-link-demo-visual";
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
  ["Add your link", "Add your destination URL, business name and logo, then approve the artwork preview."],
  ["Confirm NFC setup", "The NFC tap target uses the customer-provided URL. Branded + QR stands also generate a matching QR code."],
  ["Checkout", "Tap Rater collects the order and shipping details before preparing your stand."]
];

const flows = [
  ["No hosted activation", "No account → no hosted page → no subscription", "DIRECT products do not require a Tap Rater account or activation workflow."]
];

export default function HowItWorksPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="How it works"
        title="From product page to counter-ready stand."
        body="Direct stands are built for fast checkout: choose the stand, add one destination URL, and complete checkout."
        media={<HowItWorksHeroVisual />}
      />

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Four steps"
            title="Choose, connect, confirm, and receive."
            body="Personalize your custom stand with your logo, business name and QR code."
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
