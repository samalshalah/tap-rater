import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/storefront/faq-list";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, JsonLd } from "@/lib/seo";

const industries = {
  dentists: {
    label: "Dentists",
    singular: "dental practice",
    title: "Google Review Stand for Dentists",
    description: "Custom Google review stands for dental practices. Add your logo, NFC and QR code, then help patients reach the correct Google review link after a visit.",
    image: "/uploads-optimized/use-cases/healthcare-dental-w1200.webp",
    imageAlt: "Custom Google review stand at a modern dental practice reception",
    intro: "Place a custom Google review stand at dental reception so patients can find the correct practice review page after their appointment. NFC tap and the printed QR code open the same link you approve during setup.",
    placement: "Place the stand on the patient side of reception after the appointment is complete, away from payment terminals, private paperwork, and clinical instructions.",
    check: "Use the Google review link for the exact office location. Test it on a phone and verify the practice name and address before approving the design.",
    staff: "Keep the invitation simple: point patients to the stand if they would like to share honest feedback. Do not offer incentives or ask for a particular rating.",
    faqs: [
      { question: "Can a dental practice use a Google review stand?", answer: "Yes. Use a public Google review link for the correct dental office location. The stand makes that page easier to reach; each patient decides whether to sign in and leave feedback." },
      { question: "Where should a dental review stand go?", answer: "A clear patient-facing space at reception or checkout works well. Keep it separate from payment, patient records, and any clinical guidance." },
      { question: "Can different dental offices use the same branding?", answer: "Yes, but each office should use its own Google review link. Confirm the address and business name in the destination before approving each stand." }
    ]
  },
  restaurants: {
    label: "Restaurants",
    singular: "restaurant",
    title: "Google Review Stand for Restaurants",
    description: "Custom Google review stands for restaurants. Add your logo, NFC and QR code, then give diners a simple way to reach the correct Google review link.",
    image: "/uploads-optimized/use-cases/restaurants-cafes-w1200.webp",
    imageAlt: "Custom NFC review stand at a restaurant counter",
    intro: "A custom Google review stand gives diners a simple route to your restaurant’s review page after their visit. Your logo, NFC tap and matching QR code are prepared for the same location link.",
    placement: "Place the stand at the host desk, pickup counter, or checkout area where guests can reach it without blocking service or payment.",
    check: "Use the Google review link for the exact restaurant location. Confirm the name and address on a phone before you approve the artwork.",
    staff: "Invite honest feedback only. Do not tie a review request to a discount, free item, or a requested rating.",
    faqs: [
      { question: "Where should a restaurant put a Google review stand?", answer: "Use a reachable host, pickup, or checkout counter. A stand should be easy to see without interrupting payments, seating, or service." },
      { question: "Can one restaurant brand use different review links?", answer: "Yes. Each location should have a stand linked to its own Google Business Profile so guests reach the restaurant they visited." },
      { question: "Do diners need an app to use the stand?", answer: "No Tap Rater app is required. Guests can tap with an NFC-enabled phone or scan the QR code with their camera, then Google may ask them to sign in." }
    ]
  },
  salons: {
    label: "Salons",
    singular: "salon or beauty studio",
    title: "Google Review Stand for Salons",
    description: "Custom Google review stands for salons and beauty studios. Add your logo, NFC and QR code, then let clients open the correct Google review page after an appointment.",
    image: "/uploads-optimized/use-cases/beauty-wellness-w1200.webp",
    imageAlt: "Custom Google review stand at a beauty and wellness reception",
    intro: "Use a custom Google review stand at salon reception to help clients open the right location’s review page after an appointment. The stand combines your logo with NFC tap and a matching QR code.",
    placement: "Place the stand at reception or beside checkout after the service is complete, leaving room for clients to use their phone without interrupting payment or retail displays.",
    check: "Check the Google review link on a phone and confirm the salon name and address before approving the custom artwork.",
    staff: "Keep the request optional and consistent for all clients. Do not connect reviews to discounts, free services, or a preferred rating.",
    faqs: [
      { question: "Can a salon use a Google review stand?", answer: "Yes. Configure the stand for the public Google review link of the exact salon location. Clients choose whether to leave feedback after opening the page." },
      { question: "Should the stand go near the salon checkout?", answer: "Checkout can work after the appointment is complete, provided the stand is on the client side and separate from payment and tipping instructions." },
      { question: "Can the stand match my salon branding?", answer: "Yes. Add your logo and optional business name during setup, then approve the custom design before payment." }
    ]
  }
} as const;

type Industry = keyof typeof industries;
type PageProps = { params: Promise<{ industry: string }> };

function getIndustry(industry: string) {
  return industries[industry as Industry];
}

export function generateStaticParams() {
  return Object.keys(industries).map((industry) => ({ industry }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry } = await params;
  const content = getIndustry(industry);
  if (!content) return { title: "Page Not Found" };
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: `/google-review-stand-for/${industry}` }
  };
}

export default async function IndustryGoogleReviewStandPage({ params }: PageProps) {
  const { industry } = await params;
  const content = getIndustry(industry);
  if (!content) notFound();
  const path = `/google-review-stand-for/${industry}`;

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={breadcrumbJsonLd([{ name: "Shop", href: "/shop" }, { name: content.title, href: path }])} />
      <JsonLd data={faqJsonLd([...content.faqs])} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: absoluteUrl(path) }} />
      <PageHero
        eyebrow={`Custom Google review stand for ${content.label.toLowerCase()}`}
        title={`${content.title} with your logo, NFC + QR`}
        body={content.description}
        cta={{ href: "/product/google-review-stand", label: "Personalize your stand" }}
        image={{ src: content.image, alt: content.imageAlt, fit: "cover", priority: true }}
      />

      <SectionShell spacing="compact">
        <div className="tr-container">
          <SectionHeader align="left" title={`How to set up a review stand for your ${content.singular}`} body={content.intro} />
          <ol className="mt-8 tr-mobile-card-grid grid gap-5 md:grid-cols-3">
            <li className="rounded-xl border border-line bg-white p-6"><p className="tr-eyebrow">01</p><h2 className="mt-3 text-xl font-semibold">Choose the location</h2><p className="tr-body-sm mt-3">{content.placement}</p></li>
            <li className="rounded-xl border border-line bg-white p-6"><p className="tr-eyebrow">02</p><h2 className="mt-3 text-xl font-semibold">Check the link</h2><p className="tr-body-sm mt-3">{content.check}</p></li>
            <li className="rounded-xl border border-line bg-white p-6"><p className="tr-eyebrow">03</p><h2 className="mt-3 text-xl font-semibold">Invite honest feedback</h2><p className="tr-body-sm mt-3">{content.staff}</p></li>
          </ol>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <SectionHeader align="left" title="Custom design, clear destination" body="Add your business logo and optional name during setup. NFC tap and the printed QR code are prepared for the same Google review destination, and you approve the design before payment." />
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/product/google-review-stand" className="tr-button-primary">Build my custom stand</Link><Link href="/category/reviews" className="tr-button-outline">Browse all NFC review stands</Link></div>
        </div>
      </SectionShell>

      <SectionShell spacing="compact">
        <div className="tr-container-narrow"><SectionHeader align="left" title={`${content.title} FAQs`} /><FaqList faqs={[...content.faqs]} className="mt-7 grid gap-3" /></div>
      </SectionShell>
    </main>
  );
}
