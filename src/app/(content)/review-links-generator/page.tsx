import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ReviewLinkTool } from "@/components/forms/review-link-tool";
import { SectionShell } from "@/components/storefront/section";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Free Google Review Link Generator",
  description: "Find and copy your Google review link for free. Then put it on a review stand for Google Reviews with NFC, or personalize a stand with your logo, business name and QR code.",
  alternates: { canonical: "/review-links-generator" }
};

const questions = [
  { question: "Is the Google review link generator free?", answer: "Yes. Find, copy and use your review link without buying a stand. The stand is an optional way to share that same link with customers in person." },
  { question: "What if I cannot find my business?", answer: "Check your business name and location. You can also copy the review link from your Google Business Profile's review-sharing option and paste it into the generator." },
  { question: "Which review stand for Google Reviews should I choose?", answer: "Standard uses NFC tapping. Branded + QR includes NFC plus your logo, business name and a printed QR code. Both Direct designs open your chosen Google review link and are one-time purchases without a subscription." },
  { question: "Will my stand include the red placeholder text?", answer: "No. The red text in the custom sample shows where your logo, business name and QR code go. Your finished Branded + QR stand uses your approved business details." },
  { question: "Does opening the link automatically post a review?", answer: "No. Customers choose whether to leave a review and may need to sign in to Google. A link or stand does not guarantee a rating or publication. Invite honest feedback without incentives." }
];

export default function ReviewLinksGeneratorPage() {
  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={breadcrumbJsonLd([{ name: "Google Review Link Generator", href: "/review-links-generator" }])} />
      <SectionShell spacing="compact">
        <div className="tr-container">
          <div className="max-w-3xl">
            <p className="tr-eyebrow">Free tool for your business</p>
            <h1 className="tr-page-title mt-4">Google Review Link Generator</h1>
            <p className="tr-body mt-4">Find your business. Copy your review link. Make it easy for customers to share their experience—online or at your counter.</p>
            <p className="mt-3 text-sm text-muted">Free to use. No stand purchase required.</p>
          </div>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section id="generate-review-link" className="min-w-0 scroll-mt-24 rounded-2xl border border-line bg-white p-5 sm:p-8" aria-labelledby="generator-heading">
              <h2 id="generator-heading" className="text-xl font-semibold">Find your Google review link</h2>
              <p className="tr-body-sm mb-6 mt-2">Search for your business and confirm the correct location, or paste a review link you already have.</p>
              <ReviewLinkTool />
            </section>
            <aside className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="review-stand-next-step">
              <Link href="/product/google-review-stand?design=branded" aria-label="View the custom review stand for Google Reviews">
                <Image src="/product-galleries/google-custom/tap-rater-custom-google-review-stand-01-white-background-angled.webp" alt="Custom review stand for Google Reviews with red placeholders for your logo, business name and QR code" width={1024} height={1024} sizes="(min-width: 1024px) 440px, 100vw" className="mx-auto aspect-square max-h-80 w-full rounded-xl object-contain" />
              </Link>
              <p className="mt-3 text-xs text-muted">Custom design example. Red placeholders are replaced with your business details.</p>
              <h2 id="review-stand-next-step" className="mt-5 text-2xl font-semibold">Your link. Your logo. Your counter.</h2>
              <p className="tr-body-sm mt-3">Put your link on a <Link href="/product/google-review-stand" className="font-semibold text-brand underline underline-offset-4">review stand for Google Reviews</Link>. Customers can tap with NFC—or scan the printed QR code on the custom design—to open your review form.</p>
              <Link href="/product/google-review-stand?design=branded" className="tr-button-primary mt-5">Personalize my review stand</Link>
              <Link href="/product/google-review-stand" className="mt-4 block text-sm font-semibold text-brand underline underline-offset-4">Explore custom logo and QR</Link>
            </aside>
          </div>
        </div>
      </SectionShell>
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container">
          <h2 className="tr-section-title">From review link to countertop in three steps</h2>
          <ol className="mt-8 tr-mobile-card-grid grid gap-6 md:grid-cols-3">
            <li className="rounded-xl border border-line bg-white p-6"><h3 className="text-lg font-semibold">1. Find and check your link</h3><p className="tr-body-sm mt-3">Select your business, then open the link to check that it leads to the right Google review form. Copy it for your records.</p></li>
            <li className="rounded-xl border border-line bg-white p-6"><h3 className="text-lg font-semibold">2. Choose your stand</h3><p className="tr-body-sm mt-3">Keep it simple with Standard NFC, or choose Branded + QR for your logo, business name and printed review QR code.</p></li>
            <li className="rounded-xl border border-line bg-white p-6"><h3 className="text-lg font-semibold">3. Share it in person</h3><p className="tr-body-sm mt-3">Place your stand at reception or checkout. Invite customers to tap or scan and leave honest feedback about their visit.</p></li>
          </ol>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/product/google-review-stand" className="tr-button-primary">Choose your review stand for Google Reviews</Link><a href="#generate-review-link" className="tr-button-outline">Find my review link first</a></div>
        </div>
      </SectionShell>
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <h2 className="tr-section-title">Google review link and stand questions</h2>
          <div className="mt-6 divide-y divide-line">{questions.map(({ question, answer }) => <details key={question} className="py-5"><summary className="cursor-pointer text-lg font-semibold">{question}</summary><p className="tr-body-sm mt-3">{answer}</p></details>)}</div>
          <p className="mt-6"><a href="https://support.google.com/business/answer/3474122" className="text-sm font-semibold text-brand underline underline-offset-4">Google's guidance on sharing review links</a></p>
        </div>
      </SectionShell>
    </main>
  );
}
