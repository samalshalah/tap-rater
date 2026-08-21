import { describe, expect, it, vi } from "vitest";
import { getDefaultShippingSettings, getShippingSettingsWithClient, saveShippingSettings } from "@/lib/shipping-settings";

describe("shipping settings repository", () => {
  it("returns manual defaults when no persisted settings exist", async () => {
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
});
