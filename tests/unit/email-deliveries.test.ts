import { describe, expect, it, vi } from "vitest";
import {
  applyResendWebhookEventWithClient,
  createEmailDeliveryIdentity,
  createEmailIdempotencyKey,
  finishEmailDeliveryAttempt,
  getAdminEmailDeliveriesWithClient,
  startEmailDeliveryAttempt
} from "@/lib/email-deliveries";

describe("email delivery ledger", () => {
  it("builds stable, bounded idempotency keys without exposing source values", () => {
    const first = createEmailIdempotencyKey("paid_order_customer", "order-secret-value");
    const second = createEmailIdempotencyKey("paid_order_customer", "order-secret-value");

    expect(first).toBe(second);
    expect(first).toMatch(/^taprater\/paid_order_customer\/[0-9a-f]{64}$/);
    expect(first).not.toContain("order-secret-value");
    expect(first.length).toBeLessThanOrEqual(256);
  });

  it("records metadata and provider acceptance without storing message content", async () => {
    const db = createEmailDeliveryDb([]);
    const identity = createEmailDeliveryIdentity({
      messageType: "paid_order_customer",
      audience: "customer",
      entityType: "order",
      entityId: "order-1",
      retryable: true,
      idempotencyKey: "paid-order/order-1/customer"
    });

    await startEmailDeliveryAttempt(
      {
        identity,
        recipient: "buyer@example.com",
        subject: "Order confirmed",
        tracking: {
          messageType: "paid_order_customer",
          audience: "customer",
          entityType: "order",
          entityId: "order-1",
          retryable: true,
          idempotencyKey: "paid-order/order-1/customer"
        },
        now: new Date("2026-09-05T12:00:00.000Z")
      },
      db.client
    );
    await finishEmailDeliveryAttempt(
      {
        id: identity.id,
        sent: true,
        providerMessageId: "resend-message-1",
        now: new Date("2026-09-05T12:00:01.000Z")
      },
      db.client
    );

    expect(db.rows[0]).toMatchObject({
      id: identity.id,
      message_type: "paid_order_customer",
      recipient: "buyer@example.com",
      subject: "Order confirmed",
      status: "accepted",
      provider_message_id: "resend-message-1",
      idempotency_key: "paid-order/order-1/customer",
      entity_type: "order",
      entity_id: "order-1",
      retryable: true,
      attempt_number: 1,
      accepted_at: "2026-09-05T12:00:01.000Z"
    });
    expect(db.rows[0]).not.toHaveProperty("html");
    expect(JSON.stringify(db.rows[0])).not.toContain("activation?token=");
  });

  it("summarizes accepted, delivered, pending, and problem attempts", async () => {
    const db = createEmailDeliveryDb([
      deliveryRow({ id: "delivery-1", status: "accepted" }),
      deliveryRow({ id: "delivery-2", status: "delivered" }),
      deliveryRow({ id: "delivery-3", status: "delayed" }),
      deliveryRow({ id: "delivery-4", status: "failed" }),
      deliveryRow({ id: "delivery-5", status: "suppressed" })
    ]);

    const overview = await getAdminEmailDeliveriesWithClient(db.client);

    expect(overview).toMatchObject({
      available: true,
      acceptedCount: 1,
      deliveredCount: 1,
      pendingCount: 1,
      problemCount: 2
    });
    expect(overview.deliveries).toHaveLength(5);
  });

  it("updates accepted attempts from verified delivery webhooks", async () => {
    const db = createEmailDeliveryDb([
      deliveryRow({
        id: "delivery-1",
        status: "accepted",
        provider_message_id: "resend-message-1",
        accepted_at: "2026-09-05T12:00:00.000Z"
      })
    ]);

    const result = await applyResendWebhookEventWithClient(db.client, {
      type: "email.delivered",
      created_at: "2026-09-05T12:01:00.000Z",
      data: {
        email_id: "resend-message-1",
        created_at: "2026-09-05T12:00:00.000Z",
        from: "Tap Rater <notifications@taprater.com>",
        to: ["buyer@example.com"],
        subject: "Order confirmed"
      }
    });

    expect(result).toEqual({ ok: true, matched: true, ignored: false });
    expect(db.rows[0]).toMatchObject({
      status: "delivered",
      delivered_at: "2026-09-05T12:01:00.000Z",
      last_event_at: "2026-09-05T12:01:00.000Z"
    });
  });

  it("records provider failures and ignores older out-of-order events", async () => {
    const db = createEmailDeliveryDb([
      deliveryRow({
        id: "delivery-1",
        status: "accepted",
        provider_message_id: "resend-message-1"
      })
    ]);

    await applyResendWebhookEventWithClient(db.client, {
      type: "email.failed",
      created_at: "2026-09-05T12:02:00.000Z",
      data: {
        email_id: "resend-message-1",
        created_at: "2026-09-05T12:00:00.000Z",
        from: "Tap Rater <notifications@taprater.com>",
        to: ["buyer@example.com"],
        subject: "Order confirmed",
        failed: { reason: "reached_daily_quota" }
      }
    });
    const older = await applyResendWebhookEventWithClient(db.client, {
      type: "email.sent",
      created_at: "2026-09-05T12:01:00.000Z",
      data: {
        email_id: "resend-message-1",
        created_at: "2026-09-05T12:00:00.000Z",
        from: "Tap Rater <notifications@taprater.com>",
        to: ["buyer@example.com"],
        subject: "Order confirmed"
      }
    });

    expect(db.rows[0]).toMatchObject({ status: "failed", failure_reason: "reached_daily_quota" });
    expect(older).toEqual({ ok: true, matched: true, ignored: true });
  });
});

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-default",
    message_type: "paid_order_customer",
    audience: "customer",
    recipient: "buyer@example.com",
    subject: "Order confirmed",
    status: "accepted",
    provider_message_id: null,
    idempotency_key: "taprater/delivery-default",
    failure_reason: null,
    entity_type: "order",
    entity_id: "order-1",
    retryable: true,
    attempt_number: 1,
    retry_of_id: null,
    accepted_at: null,
    delivered_at: null,
    last_event_at: null,
    created_at: "2026-09-05T12:00:00.000Z",
    updated_at: "2026-09-05T12:00:00.000Z",
    ...overrides
  };
}

function createEmailDeliveryDb(seed: Array<Record<string, unknown>>) {
  const rows = seed.map((row) => ({ ...row }));
  const client = {
    from(table: string) {
      if (table !== "email_deliveries") throw new Error(`Unexpected table: ${table}`);
      let action: "select" | "insert" | "update" = "select";
      let values: Record<string, unknown> | null = null;
      let returnsRows = false;
      const filters: Array<{ column: string; value: unknown }> = [];
      const matchingRows = () => rows.filter((row) => filters.every((filter) => row[filter.column] === filter.value));
      const execute = async () => {
        if (action === "insert" && values) {
          rows.push({ ...values });
          return { data: returnsRows ? [{ ...values }] : null, error: null };
        }
        const matched = matchingRows();
        if (action === "update" && values) matched.forEach((row) => Object.assign(row, values));
        return { data: action === "select" || returnsRows ? matched : null, error: null };
      };
      const builder = {
        select: vi.fn(() => {
          returnsRows = action !== "select";
          return builder;
        }),
        insert: vi.fn((input: Record<string, unknown>) => {
          action = "insert";
          values = input;
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
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          const result = await execute();
          return { data: Array.isArray(result.data) ? result.data[0] ?? null : null, error: result.error };
        }),
        then(resolve: (result: { data: unknown[] | null; error: null }) => void) {
          execute().then(resolve);
        }
      };
      return builder;
    }
  };

  return { client: client as any, rows };
}
