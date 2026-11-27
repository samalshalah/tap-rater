import type { Metadata } from "next";
import Link from "next/link";
import { ProductReviewForm } from "@/components/forms/product-review-form";
import { getReviewInvitation } from "@/lib/product-reviews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share your Tap Rater experience", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ReviewInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  let unavailable = false;
  try { invitation = await getReviewInvitation(token); } catch { unavailable = true; }
  return <section className="tr-section bg-[#f6f8ff] px-4 py-12 sm:py-16"><div className="mx-auto max-w-2xl">
    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">Your Tap Rater experience</p>
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How is your stand working?</h1>
    <p className="mt-4 text-muted">Share your experience with your custom Google review stand. No account is needed.</p>
    <div className="mt-8 rounded-xl border border-line bg-white p-5 sm:p-8">
      {unavailable ? <p>We could not load this invitation just now. Please refresh in a moment.</p>
        : !invitation ? <><h2 className="text-xl font-semibold">This invitation link is invalid or expired.</h2><p className="mt-3">Please reply to your invitation email for a new link, or <Link className="text-brand underline" href="/contact-us">contact Tap Rater</Link>.</p></>
        : invitation.rating !== null ? <><h2 className="text-xl font-semibold">Thank you—your feedback has been received.</h2><p className="mt-3">To update your feedback or permissions, please reply to your invitation email.</p></>
        : <ProductReviewForm token={token} firstName={invitation.customer_name.split(/\s+/)[0]} />}
    </div>
  </div></section>;
}
