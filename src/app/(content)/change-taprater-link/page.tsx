import type { Metadata } from "next";
import { ChangeLinkForm } from "@/components/forms/change-link-form";
import { PageHero, SectionShell } from "@/components/storefront/section";

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
      <PageHero
        eyebrow="Link update"
        title="Change TapRater Link"
        body="Use this form when your review page, survey, or feedback URL changes. The request is saved in the backend for admin follow-up."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <div className="tr-card p-5 md:p-7">
            <ChangeLinkForm />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
