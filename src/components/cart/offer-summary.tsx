import { formatPrice } from "@/lib/products";
import {freeShippingCountries,thresholdShippingCountries,type OfferQuote,type OffersSettings } from "@/lib/offers";
export function OfferSummary({
  quote,
  offers,
}: {
  quote: OfferQuote;
  offers: OffersSettings;
}) {
  if (quote.discountCents <= 0 && !offers.shipping.enabled && !freeShippingCountries(offers).length) return null;
  return (
    <div
      className="rounded-lg bg-brand/5 p-3 text-sm space-y-2"
      aria-live="polite"
    >
      {quote.discountCents > 0 ? (
        <>
          <p className="font-semibold text-brand">
            {quote.label}: save {formatPrice(quote.discountCents)}
          </p>
          <p>
            Before offers {formatPrice(quote.originalCents)} · After offers{" "}
            {formatPrice(quote.subtotalCents)}
          </p>
        </>
      ) : null}
      {freeShippingCountries(offers).length>0&&<p>Free shipping on {freeShippingCountries(offers).join(", ")} orders. No minimum.</p>}
      {offers.shipping.enabled && thresholdShippingCountries(offers).length>0 && (
        <p>
          {quote.subtotalCents >= offers.shipping.thresholdCents
            ? "Your merchandise total qualifies for free shipping"
            : `Add ${formatPrice(offers.shipping.thresholdCents - quote.subtotalCents)} more after discounts for free shipping`}{" "}
          ({thresholdShippingCountries(offers).join(", ")}).
        </p>
      )}
    </div>
  );
}
