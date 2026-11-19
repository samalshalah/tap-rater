import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { WorkspacePageHeader } from "@/components/account/workspace-ui";
import { ContactForm } from "@/components/forms/contact-form";
import { requireCustomer } from "@/lib/customer-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export const metadata: Metadata = { title: "Share product feedback", robots: { index: false, follow: false } };

export default async function ProductFeedbackPage() {
  const session = await requireCustomer();
  // Prefill only; the customer can still edit both fields, and a failed lookup leaves the name blank.
  const customer = hasSupabaseAdminConfig()
    ? await getSupabaseAdmin().from("customers").select("name").eq("email", session.email).maybeSingle().then((result: { data?: { name?: string | null } | null }) => result.data, () => null)
    : null;
  return <AccountShell>
    <WorkspacePageHeader title="Feedback" description="Tell us how your Tap Rater stand is working."/>
    <section className="tr-card max-w-2xl p-3">
      <p className="mb-6 mt-3 text-sm leading-6 text-muted">Share your experience after receiving and using your stand. Positive and critical feedback are equally welcome. Your feedback goes to our team; publishing permission is optional, and there is no reward for leaving a review.</p>
      <ContactForm productFeedback defaultName={customer?.name || undefined} defaultEmail={session.email} />
    </section>
  </AccountShell>;
}
