import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { AdminInventoryUpdateInput } from "@/lib/validators";

export type AdminInventoryDbClient = {
  from: (table: string) => any;
};

export type AdminInventoryUpdateResult =
  | { ok: true; stockStatus: AdminInventoryUpdateInput["stockStatus"] }
  | { ok: false; error: string; status: number };

export async function updateAdminInventory(
  slug: string,
  stockStatus: AdminInventoryUpdateInput["stockStatus"]
): Promise<AdminInventoryUpdateResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Inventory storage is not configured.", status: 503 };
  }

  return updateAdminInventoryWithClient(getSupabaseAdmin() as AdminInventoryDbClient, slug, stockStatus);
}

export async function updateAdminInventoryWithClient(
  client: AdminInventoryDbClient,
  slug: string,
  stockStatus: AdminInventoryUpdateInput["stockStatus"],
  now = new Date()
): Promise<AdminInventoryUpdateResult> {
  try {
    const { data, error } = await client
      .from("products")
      .update({ stock_status: stockStatus, updated_at: now.toISOString() })
      .eq("slug", slug)
      .select("slug,stock_status")
      .maybeSingle();

    if (error) return { ok: false, error: "Inventory availability could not be saved.", status: 500 };
    if (!data?.slug) return { ok: false, error: "Product was not found.", status: 404 };
    return { ok: true, stockStatus };
  } catch {
    return { ok: false, error: "Inventory availability could not be saved.", status: 500 };
  }
}
