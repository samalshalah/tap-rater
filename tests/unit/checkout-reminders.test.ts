import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRecord } from "@/lib/orders";
const mocks = vi.hoisted(() => ({ query: vi.fn(), retrieve: vi.fn(), create: vi.fn(), expire: vi.fn(), send: vi.fn(), getOrder: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/storefront-analytics-server", () => ({ analyticsSql: () => ({ query: mocks.query, transaction: mocks.transaction }) }));
vi.mock("@/lib/checkout", () => ({ getStripeMode: () => "live", getStripeClient: () => ({ checkout: { sessions: { retrieve: mocks.retrieve, create: mocks.create, expire: mocks.expire } } }) }));
vi.mock("@/lib/orders", () => ({ getAdminOrderById: mocks.getOrder, getOrderLineItemProductionSummary: () => ({ optionLabel: "Branded", fulfillmentKind: "branded" }) }));
vi.mock("@/lib/commerce-email-outbox", () => ({ sendCommerceEmail: mocks.send }));
vi.mock("@/lib/email-templates", () => ({ getEmailTemplate: async () => ({ supportText: "Reply for help", footerText: "Tap Rater" }) }));
vi.mock("@/lib/db", () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock("@/lib/stripe-processing", () => ({ withStripeResourceLock: async (_client: unknown, _key: string, work: (guard: () => Promise<void>) => unknown) => work(async () => {}) }));
import { signRecoveryToken, verifyRecoveryToken, assertRecoveryUnpaid, enrollCheckoutReminder, startRecoveryPayment, sendReminder } from "@/lib/checkout-reminders";
import { buildRecoverySessionParams } from "@/lib/checkout-recovery-payment";
import { unpaidRecoverable, reminderSettingsSchema, defaultReminderSettings } from "@/lib/checkout-reminder-model";
import { renderCustomerOrderEmail } from "@/lib/customer-order-email-layout";
const order: OrderRecord = { id: "751be0f5-2003-4318-a7fd-45fd46b54d3d", stripe_checkout_session_id: "cs_live_original", status: "pending_payment", payment_status: "unpaid", email: "buyer@example.com", customer_name: "Buyer", subtotal_cents: 9999, total_cents: 9999, currency: "usd", shipping_amount_cents: 0, shipping_address_json: { line1: "Saved address", country: "US" }, production_status: "not_started", shipping_status: "not_shipped", internal_notes: "", admin_fulfillment_notes: "", created_at: "2026-10-09T22:00:00Z", line_items_json: [{ productId: "yelp-review-stand", title: "Yelp Review Stand", sku: "TEST", quantity: 2, unitAmountCents: 5000, lineSubtotalCents: 9999, destinationMode: "DIRECT", setup: { businessName: "Saved artwork" } }] };
const state = { token_expires_at: "2030-01-01T00:00:00Z", legacy_approved: false, paused: false, active_session_id: null, attempt_key: null };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("ADMIN_SESSION_SECRET", "unit-test-secret"); mocks.query.mockResolvedValue([]); mocks.getOrder.mockResolvedValue({ order }); mocks.transaction.mockResolvedValue([]); mocks.retrieve.mockResolvedValue({ id: "cs_live_original", livemode: true, payment_status: "unpaid", status: "open", payment_intent: null }); });
describe("checkout recovery safety", () => {
  it("rejects tampered, expired, malformed, and wrong-key tokens", () => {
    const token = signRecoveryToken(order.id!, 1900000000000, "key");
    expect(verifyRecoveryToken(token, "key", 1800000000000)).toBe(order.id);
    expect(verifyRecoveryToken(token, "wrong", 1800000000000)).toBeNull();
    expect(verifyRecoveryToken(token, "key", 2000000000000)).toBeNull();
    expect(verifyRecoveryToken(token.replace("751be", "651be"), "key", 1800000000000)).toBeNull();
    expect(verifyRecoveryToken(token.slice(0, -1) + "é", "key", 1800000000000)).toBeNull();
  });
  it("never enrolls test, internal, or non-consenting checkouts", async () => {
    await enrollCheckoutReminder("cs_test_x", true, false); await enrollCheckoutReminder("cs_live_x", false, false); await enrollCheckoutReminder("cs_live_x", true, true);
    expect(mocks.query).not.toHaveBeenCalled();
    await enrollCheckoutReminder("cs_live_x", true, false); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it.each(["processing", "requires_action", "succeeded", "requires_capture"])("blocks %s payments", async status => {
    mocks.retrieve.mockResolvedValue({ livemode: true, payment_status: "unpaid", status: "open", payment_intent: { status } });
    await expect(assertRecoveryUnpaid(order)).rejects.toThrow("in progress");
  });
  it("blocks paid duplicates even if this order is still pending", async () => {
    mocks.query.mockResolvedValueOnce([{ exists: 1 }]); await expect(assertRecoveryUnpaid(order)).rejects.toThrow("paid order already"); expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it("requires explicit review to convert legacy test orders", async () => {
    const legacy = { ...order, stripe_checkout_session_id: "cs_test_legacy" };
    await expect(assertRecoveryUnpaid(legacy)).rejects.toThrow("reviewed live");
    await expect(assertRecoveryUnpaid(legacy, true)).resolves.toEqual([]);
  });
  it("does not invite payment for paid, canceled, failed or refunded orders", () => {
    for (const status of ["paid", "canceled", "failed"] as const) expect(unpaidRecoverable({ ...order, status })).toBe(false);
    expect(unpaidRecoverable({ ...order, refund_status: "pending" })).toBe(false);
    expect(unpaidRecoverable({ ...order, status: "canceled", payment_status: "expired" })).toBe(true);
  });
  it("preserves discounted cents, products, and free shipping", () => {
    const params = buildRecoverySessionParams(order, "signed");
    expect(params.line_items?.reduce((sum, line) => sum + line.quantity! * line.price_data!.unit_amount!, 0)).toBe(9999);
    expect(params.mode).toBe("payment"); expect(params.invoice_creation?.enabled).toBe(true); expect(params).not.toHaveProperty("payment_method_types");
    expect(params.metadata?.recovery_original_order_id).toBe(order.id);
  });
  it("rejects inconsistent totals and missing shipping", () => {
    expect(() => buildRecoverySessionParams({ ...order, subtotal_cents: 10000 }, "t")).toThrow("totals");
    expect(() => buildRecoverySessionParams({ ...order, shipping_address_json: null }, "t")).toThrow("shipping address");
  });
  it("preserves recurring charges and rejects missing subscription prices", () => {
    const hosted = { ...order, total_cents: 10999, line_items_json: [{ ...order.line_items_json[0], destinationMode: "HOSTED" as const, monthlyAmountCents: 500, setup: { monthlyPriceCents: 1 } }] };
    const params = buildRecoverySessionParams(hosted, "t"); expect(params.mode).toBe("subscription"); expect(params.line_items!.at(-1)?.price_data?.recurring?.interval).toBe("month");
    expect(() => buildRecoverySessionParams({ ...hosted, line_items_json: [{ ...hosted.line_items_json[0], monthlyAmountCents: undefined }] }, "t")).toThrow("subscription price");
  });
  it("uses the confirmation layout without falsely claiming payment", () => {
    const html = renderCustomerOrderEmail(order, { introText: "Hello <script>alert(1)</script>", supportText: "Reply for help", footerText: "Tap Rater" }, {}, false, { subject: "Saved order", paymentUrl: "https://taprater.com/checkout/recover?token=abc", unsubscribeUrl: "https://taprater.com/checkout/recover?unsubscribe=1" });
    expect(html).toContain("AWAITING PAYMENT"); expect(html).toContain("Total due"); expect(html).not.toContain("PAYMENT RECEIVED"); expect(html).not.toContain("Total paid"); expect(html).not.toContain("<script>"); expect(html).toContain("Stop checkout reminder emails"); expect(html).toContain("border-bottom:3px solid #e5ab35");
  });
  it("reuses an existing open hosted recovery checkout", async () => {
    mocks.query.mockImplementation(async (query: string) => query.includes("SELECT * FROM checkout_reminders") ? [{ ...state, active_session_id: "cs_live_recovery" }] : query.includes("SELECT session_id") ? [{ session_id: "cs_live_recovery" }] : []);
    mocks.retrieve.mockImplementation(async (id: string) => ({ id, livemode: true, payment_status: "unpaid", status: id === "cs_live_original" ? "expired" : "open", payment_intent: null, url: id === "cs_live_recovery" ? "https://checkout.stripe.com/c/pay/recovery" : null }));
    await expect(startRecoveryPayment(order.id!)).resolves.toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/recovery" }); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not create a second checkout if expiration fails", async () => {
    mocks.query.mockImplementation(async (query: string) => query.includes("SELECT * FROM checkout_reminders") ? [state] : []); mocks.expire.mockRejectedValue(new Error("Already completed"));
    await expect(startRecoveryPayment(order.id!)).rejects.toThrow("Already completed"); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("persists the full saved artwork and linked order before returning payment", async () => {
    mocks.query.mockImplementation(async (query: string) => query.includes("SELECT * FROM checkout_reminders") ? [state] : []);
    mocks.expire.mockResolvedValue({ status: "expired" });
    mocks.create.mockResolvedValue({ id: "cs_live_new", livemode: true, amount_total: 9999, url: "https://checkout.stripe.com/c/pay/new" });
    await expect(startRecoveryPayment(order.id!)).resolves.toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/new" });
    expect(mocks.expire).toHaveBeenCalledWith("cs_live_original");
    expect(mocks.create.mock.calls[0][1].idempotencyKey).toMatch(/^order-recovery\//);
    const insert = mocks.query.mock.calls.find(([query]) => query.includes("INSERT INTO orders"));
    expect(JSON.parse(insert![1][0])).toMatchObject({ stripe_checkout_session_id: "cs_live_new", customer_details_json: { recovery_original_order_id: order.id }, shipping_address_json: order.shipping_address_json, line_items_json: [{ setup: { businessName: "Saved artwork", recoveryOriginalSession: "cs_live_original" } }] });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
  it("does not expose a payment URL when persistence fails", async () => {
    mocks.query.mockImplementation(async (query: string) => query.includes("SELECT * FROM checkout_reminders") ? [state] : []);
    mocks.expire.mockResolvedValue({ status: "expired" });
    mocks.create.mockResolvedValue({ id: "cs_live_new", livemode: true, amount_total: 9999, url: "https://checkout.stripe.com/c/pay/new" });
    mocks.transaction.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(startRecoveryPayment(order.id!)).rejects.toThrow("Database unavailable");
  });
  it("does not send while paused", async () => {
    mocks.query.mockResolvedValue([{ ...state, paused: true }]); await expect(sendReminder(order.id!, { subject: "Hi", message: "Review" }, "key")).rejects.toThrow("paused"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("requires increasing reminder times", () => { expect(reminderSettingsSchema.safeParse({ ...defaultReminderSettings, secondHours: 1 }).success).toBe(false); });
});
