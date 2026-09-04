import type { TaxSettingsInput } from "@/lib/validators";

export function getCheckoutTaxableAmountCents({
  recurringTotalCents,
  shippingState,
  shippingAmountCents,
  standTotalCents,
  taxSettings
}: {
  recurringTotalCents: number;
  shippingState?: string;
  shippingAmountCents: number;
  standTotalCents: number;
  taxSettings: TaxSettingsInput;
}) {
  if (!isShippingStateTaxable(taxSettings, shippingState)) {
    return 0;
  }

  return Math.max(
    0,
    standTotalCents +
      (taxSettings.taxRecurring ? recurringTotalCents : 0) +
      (taxSettings.taxShipping ? shippingAmountCents : 0)
  );
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

export function isShippingStateTaxable(taxSettings: TaxSettingsInput, shippingState?: string) {
  if (taxSettings.taxMode !== "manual") {
    return false;
  }

  const normalizedState = shippingState?.trim().toUpperCase();
  return Boolean(normalizedState && taxSettings.taxableStates.includes(normalizedState));
}
