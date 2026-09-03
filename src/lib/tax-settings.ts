import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { taxSettingsSchema, type TaxSettingsInput } from "@/lib/validators";

export type { TaxSettingsInput };

export type TaxSettingsDbClient = {
  from: (table: string) => any;
};

export function getDefaultTaxSettings(): TaxSettingsInput {
  return {
    taxMode: "manual",
    manualTaxRateBps: 600,
    taxLabel: "Virginia sales tax",
    taxShipping: false,
    customerFacingTaxNote: "Estimated sales tax is calculated before payment."
  };
}

export async function getTaxSettings(): Promise<TaxSettingsInput> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return getDefaultTaxSettings();
  }

  return getTaxSettingsWithClient(getSupabaseAdmin() as TaxSettingsDbClient);
}

export async function getTaxSettingsWithClient(client: TaxSettingsDbClient): Promise<TaxSettingsInput> {
  try {
    const { data, error } = await client
      .from("site_content")
      .select("payload")
      .eq("key", "tax_settings")
      .maybeSingle();

    if (error) {
      return getDefaultTaxSettings();
    }

    const parsed = taxSettingsSchema.safeParse(data?.payload ?? {});
    return parsed.success ? parsed.data : getDefaultTaxSettings();
  } catch {
    return getDefaultTaxSettings();
  }
}

export async function saveTaxSettings(client: TaxSettingsDbClient, input: TaxSettingsInput) {
  const parsed = taxSettingsSchema.parse(input);
  const payload: TaxSettingsInput = {
    taxMode: parsed.taxMode,
    manualTaxRateBps: parsed.manualTaxRateBps,
    taxLabel: parsed.taxLabel,
    taxShipping: parsed.taxShipping,
    customerFacingTaxNote: parsed.customerFacingTaxNote
  };
  const { error } = await client.from("site_content").upsert({
    key: "tax_settings",
    type: "section",
    status: "published",
    payload,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }
}
