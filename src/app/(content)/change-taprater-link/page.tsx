import type { Metadata } from "next";
import { ChangeLinkForm } from "@/components/forms/change-link-form";
import { SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Change TapRater Link",
  description: "Request a Tap Rater NFC link update for a Google review link, Facebook review link, Yelp link, survey, or feedback page.",
  alternates: {
    canonical: "/change-taprater-link"
  }
};

export default function ChangeTapRaterLinkPage() {
  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="tr-eyebrow">Link update</p>
            <h1 className="tr-page-title mt-3">Change TapRater Link</h1>
            <p className="tr-body mt-4">
              Use this form when your review page, survey, or feedback URL changes. The request is saved in the backend for admin follow-up.
            </p>
          </div>
          <div className="tr-card p-5 md:p-7">
            <ChangeLinkForm />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
