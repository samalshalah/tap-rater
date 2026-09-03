import { describe, expect, it, vi } from "vitest";
import { getCheckoutShippingAmountCents, getCheckoutShippingMode, getDefaultShippingSettings, getShippingSettingsWithClient, saveShippingSettings } from "@/lib/shipping-settings";

describe("shipping settings repository", () => {
  it("returns checkout shipping defaults when no persisted settings exist", async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                };
              }
            };
          }
        };
      }
    };

    await expect(getShippingSettingsWithClient(client)).resolves.toEqual(getDefaultShippingSettings());
  });

  it("charges $12 shipping under $55 and free shipping at $55 or more", () => {
    const settings = getDefaultShippingSettings();

    expect(getCheckoutShippingAmountCents(settings, 3900)).toBe(1200);
    expect(getCheckoutShippingMode(settings, 3900)).toBe("flat");
    expect(getCheckoutShippingAmountCents(settings, 5500)).toBe(0);
    expect(getCheckoutShippingMode(settings, 5500)).toBe("free");
    expect(getCheckoutShippingAmountCents(settings, 7800)).toBe(0);
    expect(getCheckoutShippingMode(settings, 7800)).toBe("free");
  });

  it("uses the saved flat shipping amount and supports manual or free modes", () => {
    expect(getCheckoutShippingAmountCents({ ...getDefaultShippingSettings(), flatShippingAmountCents: 795 }, 3900)).toBe(795);
    expect(getCheckoutShippingMode({ ...getDefaultShippingSettings(), shippingMode: "manual" }, 3900)).toBe("manual");
    expect(getCheckoutShippingAmountCents({ ...getDefaultShippingSettings(), shippingMode: "manual" }, 3900)).toBe(0);
    expect(getCheckoutShippingMode({ ...getDefaultShippingSettings(), shippingMode: "free" }, 3900)).toBe("free");
    expect(getCheckoutShippingAmountCents({ ...getDefaultShippingSettings(), shippingMode: "free" }, 3900)).toBe(0);
  });

  it("saves settings to site_content", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from(table: string) {
        expect(table).toBe("site_content");
        return { upsert };
      }
    };

    await saveShippingSettings(client, {
      shippingMode: "flat",
      flatShippingAmountCents: 795,
      allowedCountryCodes: ["US"],
      handlingTimeText: "Ships after production review.",
      supportedRegionsText: "United States",
      defaultCarrierNotes: "USPS or UPS",
      customerFacingShippingNote: "Shipping is added at checkout."
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      key: "shipping_settings",
      type: "section",
      status: "published",
      payload: expect.objectContaining({
        shippingMode: "flat",
        flatShippingAmountCents: 795
      })
    }));
  });

  it("saves intentional empty strings in editable text fields", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from(table: string) {
        expect(table).toBe("site_content");
        return { upsert };
      }
    };

    await saveShippingSettings(client, {
      shippingMode: "manual",
      flatShippingAmountCents: 0,
      allowedCountryCodes: ["US"],
      handlingTimeText: "",
      supportedRegionsText: "",
      defaultCarrierNotes: "",
      customerFacingShippingNote: ""
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      payload: {
        shippingMode: "manual",
        flatShippingAmountCents: 0,
        allowedCountryCodes: ["US"],
        handlingTimeText: "",
        supportedRegionsText: "",
        defaultCarrierNotes: "",
        customerFacingShippingNote: ""
      }
    }));
  });
});
