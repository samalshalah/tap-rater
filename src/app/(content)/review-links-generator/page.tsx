import type { Metadata } from "next";
import Link from "next/link";
import { ReviewLinkTool } from "@/components/forms/review-link-tool";
import { SectionShell } from "@/components/storefront/section";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Google Review Link Generator",
  description: "Find your Google Business Profile review link, copy it, and connect it to your Tap Rater stand. Customers choose whether to leave a review.",
  alternates: { canonical: "/review-links-generator" }
};

export default function ReviewLinksGeneratorPage() {
  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={breadcrumbJsonLd([{ name: "Support", href: "/support" }, { name: "Google Review Link Generator", href: "/review-links-generator" }])} />
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <Link href="/support" className="text-sm font-semibold text-brand">Support</Link>
          <h1 className="tr-page-title mt-5">Google Review Link Generator</h1>
          <p className="tr-body mt-4">A direct link to your Google Business Profile review form, ready for your NFC stand or Branded QR code.</p>
          <div className="mt-8"><ReviewLinkTool /></div>
        </div>
      </SectionShell>
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow space-y-6">
          <h2 className="tr-section-title">Your business, the right destination.</h2>
          <p className="tr-body">Check the business name and location before sharing the link. If search is unavailable, your Google Business Profile also provides a review link through its review-sharing option. That link can be pasted into the field above.</p>
          <p className="tr-body">Customers may need to sign in to Google. Opening the link does not submit a review, guarantee publication, or determine a rating. Invite honest feedback without incentives.</p>
          <p><a href="https://support.google.com/business/answer/3474122" className="text-sm font-semibold text-brand underline underline-offset-4">Google's guidance on sharing review links</a></p>
          <h2 className="tr-section-title">Connect it to a Google Review Stand.</h2>
          <p className="tr-body">Standard stands use NFC only. Branded stands add your logo, business name, and a printed QR code pointing to the same destination. Both Direct designs are one-time purchases without a subscription.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/product/google-review-stand" className="tr-button-primary">Google Review Stand</Link>
            <Link href="/pricing" className="tr-button-outline">Compare Pricing</Link>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
