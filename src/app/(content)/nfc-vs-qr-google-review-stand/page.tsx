import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/storefront/faq-list";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "NFC vs QR Code Google Review Stands",
  description: "Compare NFC and QR code Google review stands. Learn how tap and scan work together, what customers need, and how to choose a custom stand for your business.",
  alternates: { canonical: "/nfc-vs-qr-google-review-stand" }
};

const faqs = [
  {
    question: "Is NFC or a QR code better for a Google review stand?",
    answer: "They work best together. NFC offers a quick tap for compatible phones, while a printed QR code gives customers a camera-scan alternative. Both can open the same Google review link."
  },
  {
    question: "Do customers need an app to use the stand?",
    answer: "No Tap Rater app is needed. An NFC-enabled phone can open a link notification after a close-range tap; a customer can instead scan the QR code with their camera. The customer still needs internet access to load Google and may need to sign in there."
  },
  {
    question: "Does the stand need power or Wi-Fi?",
    answer: "No. The NFC tag is passive, so the stand does not need a battery, charging, or its own Wi-Fi connection. The customer uses their phone's mobile data or Wi-Fi to open the destination."
  },
  {
    question: "Can I use one stand for more than one location?",
    answer: "Use one stand per Google Business Profile location. Confirm the business name and address in the review link before approving your artwork so each stand sends customers to the correct location."
  }
];

export default function NfcVsQrGoogleReviewStandPage() {
  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={breadcrumbJsonLd([
        { name: "Shop", href: "/shop" },
        { name: "NFC vs QR Code Google Review Stands", href: "/nfc-vs-qr-google-review-stand" }
      ])} />
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: absoluteUrl("/nfc-vs-qr-google-review-stand") }} />

      <PageHero
        eyebrow="Google review stand buying guide"
        title="NFC vs. QR code: why your review stand should use both"
        body={<p className="tr-body">A custom Google review stand gives customers two simple ways to reach the review form: tap with an NFC-enabled phone or scan a printed QR code.</p>}
        cta={{ href: "/product/google-review-stand", label: "Personalize a Google review stand" }}
      />

      <SectionShell spacing="compact">
        <div className="tr-container">
          <SectionHeader align="left" title="How tap and scan work at your counter" body="Both methods should point to the same verified Google review link for the correct business location." />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-line bg-white p-6">
              <p className="tr-eyebrow">NFC tap</p>
              <h2 className="mt-3 text-xl font-semibold">Fast for compatible phones</h2>
              <p className="tr-body-sm mt-3">A customer holds an unlocked, NFC-enabled phone close to the marked area and opens the link notification. NFC is useful when the phone is already in hand, but settings and reading position can vary by device.</p>
            </article>
            <article className="rounded-xl border border-line bg-white p-6">
              <p className="tr-eyebrow">QR code scan</p>
              <h2 className="mt-3 text-xl font-semibold">A clear camera-based fallback</h2>
              <p className="tr-body-sm mt-3">Customers can point their phone camera at the printed code to open the same destination. It keeps the stand useful for people who prefer scanning or cannot use NFC on their phone.</p>
            </article>
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <SectionHeader align="left" title="Choose a custom stand, not an either-or decision" />
          <div className="mt-6 space-y-4 tr-body">
            <p>Tap Rater custom Google review stands combine NFC, a matching QR code, and your business logo in one countertop design. During setup, select or paste the review link for the exact location you want customers to reach.</p>
            <p>Before payment, review the design and destination. When the stand arrives, test both the NFC tap and QR code as a customer would. The stand only makes the correct review form easier to reach; each customer chooses whether to leave honest feedback.</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/product/google-review-stand" className="tr-button-primary">Build my custom stand</Link>
            <Link href="/review-links-generator" className="tr-button-outline">Find my Google review link</Link>
          </div>
        </div>
      </SectionShell>

      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <SectionHeader align="left" title="NFC and QR code review stand questions" />
          <FaqList faqs={faqs} className="mt-7 grid gap-3" />
        </div>
      </SectionShell>
    </main>
  );
}
