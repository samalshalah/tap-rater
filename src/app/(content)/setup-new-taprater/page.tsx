import type { Metadata } from "next";
import { SetupForm } from "@/components/forms/setup-form";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Setup New TapRater",
  description: "Send your Google review, Facebook review, Yelp, survey, or custom feedback link to set up a new Tap Rater NFC product.",
  alternates: {
    canonical: "/setup-new-taprater"
  }
};

export default function SetupPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Setup"
        title="Setup New TapRater"
        body="Send the review or feedback URL you want connected to your Tap Rater product. This creates a backend setup request for the team to review."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="tr-panel-muted mt-6 grid gap-3 text-sm text-muted">
              <p><strong className="text-ink">Accepted links:</strong> Google reviews, Facebook recommendations, Yelp pages, surveys, and custom feedback URLs.</p>
              <p><strong className="text-ink">Helpful notes:</strong> product SKU, color, business location, or any launch deadline.</p>
            </div>
          </div>
          <div className="tr-card p-5 md:p-7">
            <SetupForm />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
