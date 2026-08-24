import type { Metadata } from "next";
import { SetupForm } from "@/components/forms/setup-form";

export const metadata: Metadata = {
  title: "Setup New TapRater",
  description: "Send your Google review, Facebook review, Yelp, survey, or custom feedback link to set up a new Tap Rater NFC product.",
  alternates: {
    canonical: "/setup-new-taprater"
  }
};

export default function SetupPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="tr-eyebrow">Setup</p>
        <h1 className="tr-page-title mt-3">Setup New TapRater</h1>
        <p className="mt-4 leading-7 text-muted">
          Send the review or feedback URL you want connected to your Tap Rater product. This creates a backend setup request for the team to review.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-muted">
          <p><strong className="text-ink">Accepted links:</strong> Google reviews, Facebook recommendations, Yelp pages, surveys, and custom feedback URLs.</p>
          <p><strong className="text-ink">Helpful notes:</strong> product SKU, color, business location, or any launch deadline.</p>
        </div>
      </div>
      <div className="rounded-md border border-line bg-white p-5 shadow-sm md:p-7">
        <SetupForm />
      </div>
    </section>
  );
}
