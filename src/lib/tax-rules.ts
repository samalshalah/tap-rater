import type { TaxSettingsInput } from "@/lib/validators";

export function getCheckoutTaxableAmountCents({
  recurringTotalCents,
  shippingAmountCents,
  standTotalCents,
  taxSettings
}: {
  recurringTotalCents: number;
  shippingAmountCents: number;
  standTotalCents: number;
  taxSettings: TaxSettingsInput;
}) {
  return Math.max(0, standTotalCents + recurringTotalCents + (taxSettings.taxShipping ? shippingAmountCents : 0));
}

export function getCheckoutTaxAmountCents(taxSettings: TaxSettingsInput, taxableAmountCents: number) {
  if (taxSettings.taxMode !== "manual" || taxSettings.manualTaxRateBps <= 0 || taxableAmountCents <= 0) {
    return 0;
  }

  return Math.round((taxableAmountCents * taxSettings.manualTaxRateBps) / 10_000);
}

export function formatTaxRate(taxSettings: TaxSettingsInput) {
  return `${(taxSettings.manualTaxRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
