import Link from "next/link";
import { SectionShell } from "@/components/storefront/section";

export function GoogleReviewGuide() {
  return (
    <SectionShell spacing="compact">
      <div className="tr-container-narrow">
        <h2 className="tr-section-title">Using a Google review stand at your business</h2>
        <p className="tr-body mt-4">Place your NFC Google review stand where a visit naturally finishes: a checkout counter, reception desk, or pickup point. A customer taps with a compatible phone to open your business’s Google review form, then chooses whether to leave a review.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">NFC tap or printed QR?</h3>
            <p className="tr-body mt-2">Standard uses NFC only. For a Google review QR code stand that also supports NFC, choose Branded. Its printed QR gives customers a camera-scanning option alongside your logo and business name.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Check the location before ordering</h3>
            <p className="tr-body mt-2">Open your review link on a phone and confirm the business name and address. For multiple locations, supply each location’s own link. Customers may need to sign in to Google; a tap never posts a review automatically.</p>
          </div>
        </div>
        <p className="tr-body mt-4">Invite honest feedback from customers without rewards or asking only happy customers. The stand makes your review form easier to reach; it does not guarantee reviews, ratings, or search rankings.</p>
        <nav aria-label="Google review stand resources" className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-brand underline underline-offset-4">
          <Link href="/review-links-generator">Find and test your Google review link</Link>
          <Link href="/how-it-works">How stand setup works</Link>
          <Link href="/shipping">Preparation and shipping times</Link>
        </nav>
      </div>
    </SectionShell>
  );
}
