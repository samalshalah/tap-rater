"use client";
import {useState,useId} from 'react';
import {ChevronDown} from 'lucide-react';
import {marketingAmount,type MarketingPurchase} from '@/lib/marketing-plan';
import type {OffersSettings,OfferQuote} from '@/lib/offers';
import type {TaxSettingsInput} from '@/lib/validators';
import type {getCartRows} from '@/lib/cart';
import {formatPrice} from '@/lib/products';
import {OfferSummary} from '@/components/cart/offer-summary';
export function CheckoutSummary({
  marketing,
  promotion, offers,
  compact = false,
  dueTodayCents,
  recurringTotalCents,
  rows,
  shippingAmountCents,
  standTotalCents,
  taxAmountCents,
  taxCalculationPending,
  taxSettings,
}: {
  marketing?:MarketingPurchase;
  promotion: OfferQuote; offers: OffersSettings;
  compact?: boolean;
  dueTodayCents: number;
  recurringTotalCents: number;
  rows: ReturnType<typeof getCartRows>;
  shippingAmountCents: number;
  standTotalCents: number;
  taxAmountCents: number;
  taxCalculationPending: boolean;
  taxSettings: TaxSettingsInput;
}) {
  const [expanded, setExpanded] = useState(false);
  const summaryId = useId();
  return (
    <aside className="tr-card p-4 sm:p-5 lg:sticky lg:top-24">
      {compact ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={summaryId}
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left md:hidden"
        >
          <span>
            <span className="block text-sm font-semibold">Order summary</span>
            <span className="text-xs text-muted">
              {taxCalculationPending ? "Before tax" : "Total today"}
            </span>
          </span>
          <span className="flex items-center gap-2 font-semibold">
            {formatPrice(dueTodayCents)}
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={expanded ? "rotate-180" : ""}
            />
          </span>
        </button>
      ) : null}
      {compact && recurringTotalCents > 0 ? (
        <p className="mt-2 text-sm text-muted md:hidden">
          Then {formatPrice(recurringTotalCents)}/month for Multi-Link
        </p>
      ) : null}
      <p className={`tr-eyebrow ${compact ? "hidden md:block" : ""}`}>
        Order summary
      </p>
      <div
        id={summaryId}
        className="tr-checkout-breakdown"
        data-collapsible={compact}
        data-expanded={expanded}
      >
        <div
          className={`mt-3 grid gap-3 ${compact ? "max-h-[360px] overflow-auto pr-1" : ""}`}
        >
          {rows.length > 0 ? (
            rows.map((row) => (
              <div
                key={`${row.item.productId}-${row.option.id}-${row.item.setup?.destinationUrl ?? row.item.setup?.serviceAddon ?? ""}`}
                className="rounded-md border border-line bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-ink">
                      {row.product.title}
                    </p>
                    <p className="mt-1 text-xs text-brand">
                      {row.option.label}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-ink">
                    {formatPrice(row.lineSubtotalCents)}
                  </p>
                </div>
                {row.item.setup?.businessName ? (
                  <p className="mt-2 truncate text-xs text-muted">
                    Business: {row.item.setup.businessName}
                  </p>
                ) : null}
                {row.item.setup?.serviceMode === "HOSTED" &&
                row.item.setup?.serviceAddon === "hosted_multilink" ? (
                  <p className="mt-1 text-xs text-muted">
                    Multi-Link:{" "}
                    {formatPrice(row.item.setup.monthlyPriceCents ?? 0)}/mo
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-muted">
              Your cart is empty. Return to cart before checkout.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
          <OfferSummary quote={promotion} offers={offers} />
          <SummaryRow label="Stands after savings" value={formatPrice(standTotalCents)} />
          {marketing&&<SummaryRow label={`Growth · ${marketing.locations} location(s)`} value={`${formatPrice(marketingAmount(marketing))}/month`}/>}
          {recurringTotalCents > 0 ? (
            <SummaryRow
              label="Monthly"
              value={`${formatPrice(recurringTotalCents)}/mo`}
            />
          ) : null}
          <SummaryRow
            label="Shipping"
            value={
              shippingAmountCents > 0
                ? formatPrice(shippingAmountCents)
                : "Free"
            }
          />
          <SummaryRow
            label="Tax"
            value={
              taxCalculationPending
                ? "Enter shipping state"
                : formatPrice(taxAmountCents)
            }
          />
          <SummaryRow
            label={taxCalculationPending ? "Total before tax" : "Total"}
            value={formatPrice(dueTodayCents)}
            strong
          />
        </div>
      </div>
    </aside>
  );
}

export function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${strong ? "pt-2 text-base" : ""}`}
    >
      <span className={strong ? "font-medium text-ink" : "text-muted"}>
        {label}
      </span>
      <span className={strong ? "font-medium text-ink" : "text-ink"}>
        {value}
      </span>
    </div>
  );
}
