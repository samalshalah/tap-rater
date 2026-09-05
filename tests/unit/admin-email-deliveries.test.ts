import { describe, expect, it, vi } from "vitest";
import { retryAdminEmailDeliveryWithClient } from "@/lib/admin-email-deliveries";
import type { OrderRecord } from "@/lib/orders";

const now = new Date("2026-09-05T12:00:00.000Z");
const deliveryId = "11111111-1111-4111-8111-111111111111";

describe("admin email delivery retries", () => {
  it("atomically claims and regenerates a failed customer order email", async () => {
    const db = createRetryDb([deliveryRow()]);
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await retryAdminEmailDeliveryWithClient(db.client, deliveryId, {
      now,
      getOrderFn: vi.fn().mockResolvedValue(orderRecord()),
      getTemplateFn: vi.fn().mockResolvedValue({
        key: "customer-order-confirmation",
        name: "Customer order confirmation",
        description: "",
        subject: "Your Tap Rater order is confirmed",
        intro: "Thanks for your order.",
        body: "We are preparing it.",
        enabled: true,
        updatedAt: null
      }),
      sendEmailFn
    });

    expect(result).toEqual({ ok: true });
    expect(sendEmailFn).toHaveBeenCalledOnce();
    expect(sendEmailFn).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@example.com",
      subject: "Your Tap Rater order is confirmed",
      delivery: expect.objectContaining({
        attemptNumber: 2,
        retryOfId: deliveryId,
        idempotencyKey: "taprater/order/order-1/customer"
      })
    }));
    expect(db.rows[0].status).toBe("retried");
    expect(db.rows[0].updated_at).toBe(now.toISOString());
  });

  it("uses a fresh idempotency key after a provider-confirmed failure", async () => {
    const db = createRetryDb([deliveryRow({ provider_message_id: "resend-1" })]);
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    await retryAdminEmailDeliveryWithClient(db.client, deliveryId, {
      now,
      getOrderFn: vi.fn().mockResolvedValue(orderRecord()),
      getTemplateFn: vi.fn().mockRejectedValue(new Error("template unavailable")),
      sendEmailFn
    });

    expect(sendEmailFn).toHaveBeenCalledWith(expect.objectContaining({
      delivery: expect.not.objectContaining({ idempotencyKey: expect.anything() })
    }));
  });

  it("enforces the retry cooldown before loading the source order", async () => {
    const db = createRetryDb([
      deliveryRow({ updated_at: "2026-09-05T11:59:30.000Z" })
    ]);
    const getOrderFn = vi.fn();
    const sendEmailFn = vi.fn();

    const result = await retryAdminEmailDeliveryWithClient(db.client, deliveryId, {
      now,
      getOrderFn,
      sendEmailFn
    });

    expect(result).toEqual({
      ok: false,
      error: "Wait one minute after a failed attempt before retrying.",
      status: 429,
      retryAfterSeconds: 30
    });
    expect(getOrderFn).not.toHaveBeenCalled();
    expect(sendEmailFn).not.toHaveBeenCalled();
  });

  it("allows only one concurrent retry claim", async () => {
    const db = createRetryDb([deliveryRow()]);
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });
    const dependencies = {
      now,
      getOrderFn: vi.fn().mockResolvedValue(orderRecord()),
      getTemplateFn: vi.fn().mockResolvedValue({
        key: "customer-order-confirmation",
        name: "Customer order confirmation",
        description: "",
        subject: "Order confirmed",
        intro: "Thanks.",
        body: "Preparing.",
        enabled: true,
        updatedAt: null
      }),
      sendEmailFn
    };

    const results = await Promise.all([
      retryAdminEmailDeliveryWithClient(db.client, deliveryId, dependencies),
      retryAdminEmailDeliveryWithClient(db.client, deliveryId, dependencies)
    ]);

    expect(results).toContainEqual({ ok: true });
    expect(results).toContainEqual({ ok: false, error: "Another retry is already in progress.", status: 409 });
    expect(sendEmailFn).toHaveBeenCalledOnce();
  });

  it("rejects non-regenerable email types without sending", async () => {
    const db = createRetryDb([deliveryRow({ message_type: "customer_activation" })]);
    const sendEmailFn = vi.fn();

    const result = await retryAdminEmailDeliveryWithClient(db.client, deliveryId, {
      now,
      getOrderFn: vi.fn().mockResolvedValue(orderRecord()),
      sendEmailFn
    });

    expect(result).toEqual({
      ok: false,
      error: "This email type must be resent from its original admin workflow.",
      status: 409
    });
    expect(sendEmailFn).not.toHaveBeenCalled();
  });
});

function orderRecord(): OrderRecord {
  return {
    id: "order-1",
    stripe_checkout_session_id: "cs_test_order_1",
    status: "paid",
    payment_status: "paid",
    email: "buyer@example.com",
    customer_name: "Test Buyer",
    subtotal_cents: 3900,
    total_cents: 5334,
    currency: "usd",
    line_items_json: [{
      productId: "google-review-stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      quantity: 1,
      unitAmountCents: 3900,
      lineSubtotalCents: 3900
    }],
    shipping_amount_cents: 1200,
    production_status: "not_started",
    shipping_status: "not_shipped",
    internal_notes: "",
    admin_fulfillment_notes: ""
  };
}

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: deliveryId,
    message_type: "paid_order_customer",
    audience: "customer",
    recipient: "buyer@example.com",
    subject: "Order confirmed",
    status: "failed",
    provider_message_id: null,
    idempotency_key: "taprater/order/order-1/customer",
    failure_reason: "email_send_exception",
    entity_type: "order",
    entity_id: "order-1",
    retryable: true,
    attempt_number: 1,
    retry_of_id: null,
    accepted_at: null,
    delivered_at: null,
    last_event_at: null,
    created_at: "2026-09-05T10:00:00.000Z",
    updated_at: "2026-09-05T10:00:00.000Z",
    ...overrides
  };
}

function createRetryDb(seed: Array<Record<string, unknown>>) {
  const rows = seed.map((row) => ({ ...row }));
  const client = {
    from(table: string) {
      if (table !== "email_deliveries") throw new Error(`Unexpected table: ${table}`);
      let action: "select" | "update" = "select";
      let values: Record<string, unknown> | null = null;
      let shouldReturnRows = false;
      const filters: Array<{ column: string; value: unknown }> = [];
      const matches = () => rows.filter((row) => filters.every(({ column, value }) => row[column] === value));
      const execute = async () => {
        const matched = matches();
        if (action === "update" && values) matched.forEach((row) => Object.assign(row, values));
        return { data: action === "select" || shouldReturnRows ? matched.map((row) => ({ ...row })) : null, error: null };
      };
      const builder = {
        select: vi.fn(() => {
          if (action === "update") shouldReturnRows = true;
          return builder;
        }),
        update: vi.fn((input: Record<string, unknown>) => {
          action = "update";
          values = input;
          return builder;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          const result = await execute();
          return { data: result.data?.[0] ?? null, error: result.error };
        }),
        then(resolve: (result: { data: Array<Record<string, unknown>> | null; error: null }) => void) {
          execute().then(resolve);
        }
      };
      return builder;
    }
  };

  return { client: client as any, rows };
}
