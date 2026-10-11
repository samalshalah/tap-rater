import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/storefront/faq-list";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { ProductCard } from "@/components/product/product-card";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";
import { getStorefrontProducts, staticStorefrontProducts } from "@/lib/product-repository";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { formatPrice } from "@/lib/products";
import { multiLinkDemoImage } from "@/lib/marketing-images";

export const dynamic = "force-dynamic";

const benefits = [
  "NFC opens one permanent Tap Rater URL; Branded also includes printed QR",
  "Up to 10 editable links",
  "Change links anytime",
  "Customer account included",
  "No need to replace the stand when links change",
  "Mobile-friendly hosted landing page"
];

const monthlyPrice = formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "");
const maxLinks = hostedMultiLinkServiceAddon.maxLinks;
const pageTitle = "Multi-Link NFC Stands for Business";
const description = `Shop compatible multi-link NFC stands for reviews, menus, bookings and social profiles. Add up to ${maxLinks} editable links for ${monthlyPrice}/month per page, plus the stand.`;
const faqs = [
  {
    question: "What is a multi-link NFC stand?",
    answer: `A multi-link NFC stand opens one mobile-friendly page where customers choose from up to ${maxLinks} links. Your menu, booking page, social profiles, website and feedback destinations can share one countertop stand. Multi-Link is a hosted service added to a compatible physical Tap Rater stand.`
  },
  {
    question: "How does one NFC tap open multiple links?",
    answer: "The NFC chip opens one Tap Rater page, not several websites at once. That page displays your chosen links, and the customer selects where to go. A tap does not automatically submit a review, follow an account or make a booking."
  },
  {
    question: "Can customers scan a QR code instead of tapping?",
    answer: "Choose a compatible Branded + QR stand for both NFC and a printed QR code pointing to the same Multi-Link page. Standard stands are NFC-only and have no printed QR code."
  },
  {
    question: "How much does a multi-link stand cost?",
    answer: `The physical stand is a separate one-time purchase at the price shown on its product page. The optional Multi-Link service costs ${monthlyPrice}/month per hosted page. Final stand pricing, shipping and applicable tax are shown before payment.`
  },
  {
    question: "Can I change my links after the stand arrives?",
    answer: `Yes. Manage up to ${maxLinks} links from your Tap Rater customer account. The stand continues to open the same hosted page when you update its links, so you do not need a replacement stand for those changes.`
  },
  {
    question: "Do all Tap Rater stands support Multi-Link?",
    answer: "No. Multi-Link is available only on compatible products whose printed message suits a choice of destinations. Choose from the compatible stands on this page and add the Multi-Link service during setup. If you only need one destination, choose Direct, which has no Multi-Link subscription."
  }
];

export const metadata: Metadata = {
  title: pageTitle,
  description,
  alternates: { canonical: "/multi-link" },
  openGraph: {
    title: `${pageTitle} | Tap Rater`,
    description,
    url: "/multi-link",
    type: "website",
    images: [{ url: multiLinkDemoImage.src, alt: multiLinkDemoImage.alt }]
  },
  twitter: {
    card: "summary_large_image",
    title: `${pageTitle} | Tap Rater`,
    description,
    images: [multiLinkDemoImage.src]
  }
};

export default async function MultiLinkPage() {
  const databaseCompatibleProducts = (await getStorefrontProducts()).filter(productSupportsMultiLink);
  const compatibleProducts = (databaseCompatibleProducts.length > 0 ? databaseCompatibleProducts : staticStorefrontProducts().filter(productSupportsMultiLink)).slice(0, 8);

  return (
    <main className="tr-public-shell text-ink">
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHero
        eyebrow="One stand. More ways to connect."
        title="Multi-Link NFC Stands for Business"
        body={`Give customers one place to find your menu, bookings, social profiles, reviews and website. Add up to ${maxLinks} editable links to a compatible stand for ${monthlyPrice}/month per hosted page, plus the physical stand. Standard remains NFC-only, with no printed QR. Branded adds a QR code pointing to the same page.`}
        cta={{ href: "#compatible-stands", label: "Shop Compatible Stands" }}
        image={{
          ...multiLinkDemoImage,
          priority: true
        }}
      />

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Hosted page"
            title="One permanent page for every customer action."
            body="One tap opens your mobile-friendly link page. Customers choose their next action, while you manage the destinations from your Tap Rater account."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <article key={benefit} className="tr-card p-5">
                <p className="tr-eyebrow text-brand">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-lg font-semibold leading-6 text-ink">{benefit}</h2>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#compatible-stands" className="tr-button-primary">
              Shop Compatible Stands
            </Link>
            <Link href="/shop" className="tr-button-outline">
              Browse All Stands
            </Link>
            <Link href="/pricing" className="tr-button-outline">
              Compare Pricing
            </Link>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="tr-container">
          <SectionHeader eyebrow="Built for your counter" title="An NFC stand with multiple links, chosen for your business." />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { title: "Restaurants and cafes", body: "Put your digital menu, online ordering, reservations and social profiles on one page. Customers choose the link they need." },
              { title: "Salons and service businesses", body: "Share appointment booking, service information, contact details and social profiles from a stand at reception." },
              { title: "Retail and customer service", body: "Connect your shop, product information, feedback and social channels. Update destinations as your business changes." }
            ].map((item) => <article key={item.title} className="tr-card p-6"><h3 className="text-xl font-semibold">{item.title}</h3><p className="tr-body mt-3">{item.body}</p></article>)}
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader eyebrow="Choose your setup" title="Direct link or Multi-Link?" body="Choose the experience you want customers to see after they tap." />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="tr-card p-6">
              <h3 className="text-xl font-semibold">Direct: one destination</h3>
              <p className="tr-body mt-3">Open one supplied URL, such as a menu or booking page. Direct has no Multi-Link subscription and suits a stand with one clear action.</p>
            </article>
            <article className="tr-card p-6">
              <h3 className="text-xl font-semibold">Multi-Link: a choice of destinations</h3>
              <p className="tr-body mt-3">Open an editable Tap Rater page with up to {maxLinks} links. The service is {monthlyPrice}/month per page, plus the compatible physical stand.</p>
            </article>
          </div>
          <p className="tr-body mt-6">For a multi-link QR code stand, choose Branded + QR. Both its printed QR code and NFC tap open the same page. Standard uses NFC only. The destination you link to may require its own app or sign-in.</p>
          <Link href="/pricing" className="tr-editorial-link mt-5">Compare stand and Multi-Link pricing</Link>
        </div>
      </SectionShell>

      <SectionShell spacing="default">
        <div id="compatible-stands" className="tr-container">
          <SectionHeader
            align="left"
            eyebrow="Compatible products"
            title="Shop stands that can add Multi-Link."
            body="Multi-Link is offered only on products whose physical message can reasonably open multiple customer links."
          />
          <div className="tr-product-grid mt-8">
            {compatibleProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </SectionShell>
      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader eyebrow="Before you choose" title="Multi-link stand questions" />
          <FaqList faqs={faqs} />
        </div>
      </SectionShell>
    </main>
  );
}
