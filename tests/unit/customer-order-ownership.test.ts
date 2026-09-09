import { describe, expect, it, vi } from "vitest";
import { getCustomerOrderByIdWithClient } from "@/lib/orders";

function database(row: Record<string, unknown> | null, error: unknown = null) {
  const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: row, error })) };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  const client = { from: vi.fn(() => builder) };
  return { client, builder };
}

describe("customer order ownership query", () => {
  it("scopes the database lookup by both order id and authenticated email", async () => {
    const { client, builder } = database({ id: "order-1", email: "owner@example.com" });
    expect(await getCustomerOrderByIdWithClient(client, "order-1", " OWNER@EXAMPLE.COM ")).toMatchObject({ id: "order-1" });
    expect(client.from).toHaveBeenCalledWith("orders");
    expect(builder.eq.mock.calls).toEqual([["id", "order-1"], ["email", "owner@example.com"]]);
  });
  it.each([null, { id: "order-1", email: "other@example.com" }, { id: "order-2", email: "owner@example.com" }])("rejects a missing or mismatched row", async row => {
    expect(await getCustomerOrderByIdWithClient(database(row).client, "order-1", "owner@example.com")).toBeNull();
  });
  it("does not query without an email", async () => {
    const { client } = database(null);
    expect(await getCustomerOrderByIdWithClient(client, "order-1", " ")).toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });
  it("reports database failure instead of treating it as a missing order", async () => {
    const { client } = database(null, { message: "database private error" });
    await expect(getCustomerOrderByIdWithClient(client, "order-1", "owner@example.com")).rejects.toThrow("Customer order storage is unavailable.");
  });
});
