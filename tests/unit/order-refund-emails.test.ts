import { describe, expect, it, vi } from "vitest";
import { saveOrderRefundSummaryWithClient } from "@/lib/order-refunds";
import { sendOrderRefundedEmails } from "@/lib/order-refund-emails";
import type { OrderRecord } from "@/lib/orders";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";

const order: OrderRecord = {
  id: "order-1",
  stripe_checkout_session_id: "cs_test_1",
  stripe_payment_intent_id: "pi_test_1",
  status: "paid",
  payment_status: "paid",
  email: "mike@example.com",
  customer_name: "Mike Example",
  subtotal_cents: 4600,
  total_cents: 4600,
  currency: "usd",
  line_items_json: [{ quantity: 1, title: "Custom Yelp Stand" } as OrderRecord["line_items_json"][number]],
  shipping_amount_cents: 0,
  production_status: "ready_for_production",
  shipping_status: "not_shipped",
  internal_notes: "",
  admin_fulfillment_notes: "",
};
const succeeded = [{ id: "re_1", amount: 4600, status: "succeeded", created: 100 }];

describe("order refunded emails", () => {
  it("emails the customer and admin with the amount and the bank timing", async () => {
    const send = vi.fn().mockResolvedValue({ sent: true });
    const result = await sendOrderRefundedEmails({ ...order, stripe_refund_id: "re_1" }, 4600, { sendEmailFn: send, env: { ORDER_NOTIFICATION_EMAIL: "order@taprater.com" } });
    expect(result.customer).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(2);
    const [customer, admin] = send.mock.calls.map(([input]) => input);
    expect(customer.to).toBe("mike@example.com");
    expect(customer.subject).toMatch(/canceled and refunded/);
    expect(customer.html).toContain("Hi Mike");
    expect(customer.html).toContain("$46.00");
    expect(customer.html).toContain("5–10 business days");
    expect(customer.delivery.messageType).toBe("order_refunded_customer");
    expect(admin.to).toBe("order@taprater.com");
    expect(admin.replyTo).toBe("mike@example.com");
    expect(admin.html).toContain("/admin/orders/order-1");
    expect(customer.delivery.idempotencyKey).not.toBe(admin.delivery.idempotencyKey);
  });

  it("never fails because an email could not be sent", async () => {
    const send = vi.fn().mockRejectedValue(new Error("provider down"));
    const result = await sendOrderRefundedEmails(order, 4600, { sendEmailFn: send, env: {} });
    expect(result.customer).toEqual({ sent: false, reason: "email_send_exception" });
    expect(result.admin).toEqual({ sent: false, reason: "missing_notification_email" });
  });

  it("notifies once, when the order first becomes fully refunded", async () => {
    const client = new PaymentMemoryDb({ orders: [structuredClone(order)] });
    const notify = vi.fn().mockResolvedValue(undefined);
    await saveOrderRefundSummaryWithClient(client, order, succeeded, notify);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ id: "order-1", payment_status: "refunded", stripe_refund_id: "re_1" }), 4600);
    await saveOrderRefundSummaryWithClient(client, { ...order, payment_status: "refunded" }, succeeded, notify);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("does not email for pending or partial refunds, and a failed email keeps the refund saved", async () => {
    const client = new PaymentMemoryDb({ orders: [structuredClone(order)] });
    const notify = vi.fn().mockRejectedValue(new Error("boom"));
    await saveOrderRefundSummaryWithClient(client, order, [{ id: "re_p", amount: 4600, status: "pending", created: 1 }], notify);
    await saveOrderRefundSummaryWithClient(client, order, [{ id: "re_part", amount: 1000, status: "succeeded", created: 1 }], notify);
    expect(notify).not.toHaveBeenCalled();
    await expect(saveOrderRefundSummaryWithClient(client, order, succeeded, notify)).resolves.toMatchObject({ paymentStatus: "refunded" });
    expect(client.table("orders")[0].payment_status).toBe("refunded");
  });
});
