import { offerIsActive, type OffersSettings } from "@/lib/offers";
import { formatPrice } from "@/lib/products";
export function ProductOffers({
  productId = "",
  branded = true,
  settings,
}: {
  productId?: string;
  branded?: boolean;
  settings: OffersSettings | null;
}) {
  if (!settings) return null;
  const now = Date.now();
  const eligible =
    settings.enabled && !settings.excludedProducts.includes(productId);
  return (
    <div className="tr-container my-4">
      <aside className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm space-y-2">
        <p className="font-semibold">Automatic stand offers</p>
        {eligible && offerIsActive(settings.second, now) && (
          <p>
            Buy two eligible stands and save {settings.second.percent}% on one
            lower-priced stand. Mix products to cover more counters.
          </p>
        )}
        {eligible &&
          (offerIsActive(settings.bundle3, now) ||
            offerIsActive(settings.bundle5, now)) && (
            <p>
              Bundle savings on{" "}
              {offerIsActive(settings.bundle3, now) ? "3+" : "5+"} eligible
              stands. Standard and Branded designs can be mixed.
            </p>
          )}
        {eligible && branded && offerIsActive(settings.upgrade, now) && (
          <p>
            Choose Branded and save {formatPrice(settings.upgrade.savingCents)}{" "}
            per stand when it is your best offer.
          </p>
        )}
        {settings.shipping.enabled && (
          <p>
            Free shipping at {formatPrice(settings.shipping.thresholdCents)}{" "}
            after discounts ({settings.shipping.countryCodes.join(", ")}).
          </p>
        )}
        <p className="text-muted">
          Your best eligible discount is applied in the cart. Offers do not
          combine. Hosted subscriptions and custom quotes are excluded.
        </p>
      </aside>
    </div>
  );
}
