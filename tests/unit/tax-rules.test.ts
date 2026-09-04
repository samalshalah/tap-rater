import { describe, expect, it } from "vitest";
import { getDefaultTaxSettings } from "@/lib/tax-settings";
import { getCheckoutTaxableAmountCents, getCheckoutTaxAmountCents, isShippingStateTaxable } from "@/lib/tax-rules";

describe("manual checkout tax rules", () => {
  it("waits for a taxable shipping state before applying tax", () => {
    const settings = getDefaultTaxSettings();

    expect(isShippingStateTaxable(settings)).toBe(false);
    expect(
      getCheckoutTaxableAmountCents({
        recurringTotalCents: 999,
        shippingAmountCents: 1200,
        standTotalCents: 3900,
        taxSettings: settings
      })
    ).toBe(0);
  });

  it("applies Virginia tax to physical stands but not recurring service by default", () => {
    const settings = getDefaultTaxSettings();
    const taxableAmount = getCheckoutTaxableAmountCents({
      recurringTotalCents: 999,
      shippingAmountCents: 1200,
      shippingState: "va",
      standTotalCents: 3900,
      taxSettings: settings
    });

    expect(taxableAmount).toBe(3900);
    expect(getCheckoutTaxAmountCents(settings, taxableAmount)).toBe(234);
  });

  it("does not apply Virginia tax to an out-of-state shipment", () => {
    const settings = getDefaultTaxSettings();

    expect(
      getCheckoutTaxableAmountCents({
        recurringTotalCents: 0,
        shippingAmountCents: 1200,
        shippingState: "DC",
        standTotalCents: 3900,
        taxSettings: settings
      })
    ).toBe(0);
  });

  it("can include recurring service and shipping when explicitly configured", () => {
    const settings = {
      ...getDefaultTaxSettings(),
      taxRecurring: true,
      taxShipping: true
    };

    expect(
      getCheckoutTaxableAmountCents({
        recurringTotalCents: 999,
        shippingAmountCents: 1200,
        shippingState: "VA",
        standTotalCents: 3900,
        taxSettings: settings
      })
    ).toBe(6099);
  });
});
