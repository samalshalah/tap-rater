import { describe, expect, it, vi } from "vitest";
import { ensureOrderCustomerRecord } from "@/lib/order-customers";

describe("ensureOrderCustomerRecord", () => {
  it("creates a pending account record for a real order buyer without sending access", async () => {
    const inserted = vi.fn().mockReturnValue({ then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }) });
    const client = {
      from: vi.fn((table: string) => table === "customers" ? {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: inserted
      } : null)
    };

    await expect(ensureOrderCustomerRecord(client, {
      email: " Buyer@Example.com ",
      customer_name: "Buyer",
      customer_details_json: { phone: "555-0100" }
    })).resolves.toEqual({ created: true, skipped: false });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({
      email: "buyer@example.com", name: "Buyer", phone: "555-0100", account_status: "pending_activation"
    }));
  });

  it("does not create an account for an invalid or blank email", async () => {
    const client = { from: vi.fn() };
    await expect(ensureOrderCustomerRecord(client, { email: "" })).resolves.toEqual({ created: false, skipped: true });
    expect(client.from).not.toHaveBeenCalled();
  });
});
