import type { Metadata } from "next";
import { ChangeLinkForm } from "@/components/forms/change-link-form";

export const metadata: Metadata = {
  title: "Change TapRater Link",
  description: "Request a Tap Rater NFC link update for a Google review link, Facebook review link, Yelp link, survey, or feedback page.",
  alternates: {
    canonical: "/change-taprater-link"
  }
};

export default function ChangeTapRaterLinkPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="tr-eyebrow">Link update</p>
        <h1 className="tr-page-title mt-3">Change TapRater Link</h1>
        <p className="mt-4 leading-7 text-muted">
          Use this form when your review page, survey, or feedback URL changes. The request is saved in the backend for admin follow-up.
        </p>
      </div>
      <div className="rounded-md border border-line bg-white p-5 shadow-sm md:p-7">
        <ChangeLinkForm />
      </div>
    </section>
  );
}
