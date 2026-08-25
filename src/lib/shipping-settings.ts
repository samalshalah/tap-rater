import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { shippingSettingsSchema, type ShippingSettingsInput } from "@/lib/validators";

export type { ShippingSettingsInput };

export type ShippingSettingsDbClient = {
  from: (table: string) => any;
};

export function getDefaultShippingSettings(): ShippingSettingsInput {
  return {
    shippingMode: "manual",
    flatShippingAmountCents: 0,
    allowedCountryCodes: ["US"],
    handlingTimeText: "",
    supportedRegionsText: "United States",
    defaultCarrierNotes: "",
    customerFacingShippingNote: "Shipping timelines are shown at checkout or shared after order review when applicable."
  };
}

export async function getShippingSettings(): Promise<ShippingSettingsInput> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return getDefaultShippingSettings();
  }

  return getShippingSettingsWithClient(getSupabaseAdmin() as ShippingSettingsDbClient);
}

export async function getShippingSettingsWithClient(client: ShippingSettingsDbClient): Promise<ShippingSettingsInput> {
  try {
    const { data, error } = await client
      .from("site_content")
      .select("payload")
      .eq("key", "shipping_settings")
      .maybeSingle();

    if (error) {
      return getDefaultShippingSettings();
    }

    const parsed = shippingSettingsSchema.safeParse(data?.payload ?? {});
    return parsed.success ? parsed.data : getDefaultShippingSettings();
  } catch {
    return getDefaultShippingSettings();
  }
}

export async function saveShippingSettings(client: ShippingSettingsDbClient, input: ShippingSettingsInput) {
  const parsed = shippingSettingsSchema.parse(input);
  const payload: ShippingSettingsInput = {
    shippingMode: parsed.shippingMode,
    flatShippingAmountCents: parsed.flatShippingAmountCents,
    allowedCountryCodes: parsed.allowedCountryCodes,
    handlingTimeText: parsed.handlingTimeText,
    supportedRegionsText: parsed.supportedRegionsText,
    defaultCarrierNotes: parsed.defaultCarrierNotes,
    customerFacingShippingNote: parsed.customerFacingShippingNote
  };
  const { error } = await client.from("site_content").upsert({
    key: "shipping_settings",
    type: "section",
    status: "published",
    payload,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function getCheckoutShippingAmountCents(settings: ShippingSettingsInput) {
  return settings.shippingMode === "flat" ? settings.flatShippingAmountCents : 0;
}
