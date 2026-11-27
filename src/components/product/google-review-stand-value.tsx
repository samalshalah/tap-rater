import Link from "next/link";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import styles from "./google-review-stand-value.module.css";

const comparison = [
  {
    feature: "Your branding",
    included: "Your logo and optional business name, with an artwork preview to approve before payment.",
    diy: "Create and arrange your own logo, text, and QR code."
  },
  {
    feature: "Material & size",
    included: "6.5 × 4.25 inch acrylic display (165 × 108 mm), with a 1.97 inch (50 mm) base.",
    diy: "Paper in the size you print. Supply a holder or frame if needed."
  },
  {
    feature: "Tap or scan",
    included: "NFC tap and a printed QR code. Both open the Google review link you approve.",
    diy: "QR scanning. NFC tapping needs a separate NFC tag and setup."
  },
  {
    feature: "Printing & setup",
    included: "Printed in the USA and set up with your approved Google review link, ready to use.",
    diy: "Generate your QR code, print the sign, and assemble the display yourself."
  },
  {
    feature: "Shipping",
    included: "Free U.S. shipping, with no minimum order.",
    diy: "Depends on where you buy printing supplies and a holder."
  },
  {
    feature: "Ongoing cost",
    included: "No subscription or Tap Rater account required for the direct Google review link.",
    diy: "A QR code that points directly to your Google review link needs no subscription."
  }
];

export function GoogleReviewStandValue({ price }: { price: string }) {
  return <SectionShell id="whats-included" spacing="default" className="scroll-mt-24">
    <div className="tr-container">
      <SectionHeader
        align="left"
        eyebrow="One stand. Your brand."
        title={`What your ${price} custom stand includes`}
        body="Compare a ready-to-use custom stand with making your own paper QR sign. Both can open your Google review link; the difference is the display, NFC tapping, and the setup included."
      />
      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        <table role="table" className={`${styles.comparison} w-full table-fixed border-collapse text-left text-sm leading-6 sm:text-base`}>
          <caption className="sr-only">Tap Rater custom Google review stand compared with a DIY paper QR sign</caption>
          <thead role="rowgroup">
            <tr role="row" className="border-b border-line">
              <th scope="col" className="w-[23%] p-3 font-semibold sm:w-1/5 sm:p-5">Feature</th>
              <th scope="col" className="w-[41%] bg-[#f6f8ff] p-3 font-semibold sm:w-2/5 sm:p-5">
                <span className="block text-brand">Tap Rater custom stand</span>
                <span className="mt-1 block text-sm font-medium text-muted">{price} · one-time purchase</span>
              </th>
              <th scope="col" className="p-3 font-semibold sm:p-5">DIY paper QR sign</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {comparison.map((row) => <tr role="row" key={row.feature} className="border-b border-line last:border-b-0">
              <th role="rowheader" scope="row" className="p-3 align-top font-semibold sm:p-5">{row.feature}</th>
              <td role="cell" className="bg-[#f6f8ff] p-3 align-top sm:p-5"><span aria-hidden="true" className="mb-2 block text-xs font-semibold text-brand sm:hidden">Tap Rater · {price}</span>{row.included}</td>
              <td role="cell" className="p-3 align-top text-muted sm:p-5"><span aria-hidden="true" className="mb-2 block text-xs font-semibold text-ink sm:hidden">DIY paper QR sign</span>{row.diy}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <p className="tr-body-sm max-w-3xl">Price is for one custom stand with a direct Google review link; applicable tax is calculated at checkout. An optional <Link href="/multi-link" className="font-semibold text-brand underline underline-offset-4">editable Multi-Link page</Link> is separate at {formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page. Neither a stand nor a QR code guarantees reviews or a particular rating.</p>
        <a href="#stand-setup" className="tr-button-primary shrink-0">Customize your stand</a>
      </div>
    </div>
  </SectionShell>;
}

export function GoogleReviewStandCustomerReviews({ data = { reviews: [], count: 0, average: null } }: { data?: import("@/lib/product-review-shared").PublicProductReviews }) {
  return <SectionShell id="customer-reviews" tone="soft" spacing="compact" className="scroll-mt-24">
    <div className="tr-container">
      <SectionHeader align="left" title="Customer reviews" body="Experiences with the custom Google review stand." />
      {data.count > 0 ? <div className="mt-7">
        <p className="text-lg font-semibold">{data.average}/5 · {data.count} customer review{data.count === 1 ? "" : "s"}</p>
        <p className="mt-2 text-sm text-muted">Reviews from invited customers, published with their permission. Positive and critical feedback are equally welcome.{data.count > data.reviews.length ? ` Showing the ${data.reviews.length} most recent reviews.` : ""}</p>
        <div className="mt-5 grid items-start gap-5 md:grid-cols-2">{data.reviews.map(review => <article key={review.id} className="min-w-0 rounded-xl border border-line bg-white p-6">
          <p className="font-semibold"><span aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></p>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{review.review_body}</p>
          {review.has_photo ? <a href={`/api/product-reviews/photo/${review.id}`} target="_blank" rel="noreferrer"><img src={`/api/product-reviews/photo/${review.id}`} alt="Customer photo of their Tap Rater stand in use" className="mt-4 max-h-72 w-auto max-w-full rounded-lg" loading="lazy" /></a> : null}
          <p className="mt-4 text-sm font-semibold">{review.display_name}{review.business_name ? ` · ${review.business_name}` : ""}</p>
          <time dateTime={review.submitted_at} className="mt-1 block text-xs text-muted">{new Date(review.submitted_at).toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric" })}</time>
        </article>)}</div>
      </div> : null}
      <div className="mt-7 flex flex-col gap-6 rounded-xl border border-line bg-white p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold">{data.count ? "Already using this stand?" : "No customer reviews published here yet"}</h3>
          <p className="tr-body-sm mt-3">Tell us about the print, setup, and everyday use. Positive and critical feedback are equally welcome.</p>
          <p className="mt-3 text-sm leading-6 text-muted">We check your order and ask permission before publishing your feedback. Your email and order number stay private.</p>
        </div>
        <Link href="/contact-us?feedback=google-review-stand" className="tr-button-outline shrink-0">Share your experience</Link>
      </div>
    </div>
  </SectionShell>;
}
