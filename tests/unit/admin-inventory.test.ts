import { describe, expect, it, vi } from "vitest";
import { updateAdminInventoryWithClient, type AdminInventoryDbClient } from "@/lib/admin-inventory";

describe("admin inventory updates", () => {
  it("updates availability by product slug", async () => {
    const db = createClient({ data: { slug: "google-review-stand", stock_status: "outofstock" }, error: null });

    await expect(
      updateAdminInventoryWithClient(
        db.client,
        "google-review-stand",
        "outofstock",
        new Date("2026-09-05T12:00:00.000Z")
      )
    ).resolves.toEqual({ ok: true, stockStatus: "outofstock" });

    expect(db.from).toHaveBeenCalledWith("products");
    expect(db.update).toHaveBeenCalledWith({
      stock_status: "outofstock",
      updated_at: "2026-09-05T12:00:00.000Z"
    });
    expect(db.eq).toHaveBeenCalledWith("slug", "google-review-stand");
  });

  it("reports missing products without creating inventory rows", async () => {
    const db = createClient({ data: null, error: null });

    await expect(updateAdminInventoryWithClient(db.client, "missing-product", "instock")).resolves.toEqual({
      ok: false,
      error: "Product was not found.",
      status: 404
    });
  });

  it("returns an operational error when persistence fails", async () => {
    const db = createClient({ data: null, error: { message: "database unavailable" } });

    await expect(updateAdminInventoryWithClient(db.client, "google-review-stand", "instock")).resolves.toEqual({
      ok: false,
      error: "Inventory availability could not be saved.",
      status: 500
    });
  });
});

function createClient(result: { data: Record<string, unknown> | null; error: { message: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return { client: { from } as unknown as AdminInventoryDbClient, from, update, eq };
}
