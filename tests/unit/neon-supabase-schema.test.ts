import { describe, expect, it, vi } from "vitest";
import { createNeonSupabaseAdapter } from "@/lib/neon-supabase-adapter";
describe("adapter identifier guards", () => {
  it.each(["__proto__", "constructor", "toString", "orders; drop table orders"])("rejects table %s without executing SQL", async table => {
    const execute = vi.fn().mockResolvedValue([]);
    const result = await createNeonSupabaseAdapter(execute).from(table).select("*");
    expect(result.error?.message).toBe(`Unsupported table: ${table}`);
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(["__proto__", "constructor", "toString", "email; drop table customers"])("rejects column %s without executing SQL", async column => {
    const execute = vi.fn().mockResolvedValue([]);
    const result = await createNeonSupabaseAdapter(execute).from("customers").select(column);
    expect(result.error?.message).toBe(`Unsupported column for customers: ${column}`);
    expect(execute).not.toHaveBeenCalled();
  });
  it("keeps column permissions scoped to each table", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const client = createNeonSupabaseAdapter(execute);
    expect((await client.from("customers").select("password_hash")).error).toBeNull();
    execute.mockClear();
    expect((await client.from("products").select("password_hash")).error?.message).toBe("Unsupported column for products: password_hash");
    expect(execute).not.toHaveBeenCalled();
  });
});
