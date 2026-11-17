import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { buildStripeCheckoutLineItems, validateCheckoutCart } from "@/lib/checkout";
import { createPendingOrderForCheckoutWithClient, savePaidOrderFromCheckoutSessionWithClient, updateOrderFulfillmentWithClient } from "@/lib/orders";
import { createNeonSupabaseAdapterFromUrl } from "@/lib/neon-supabase-adapter";
import { customStandItem } from "../helpers/custom-stand";

describe.skipIf(process.env.PHYSICAL_SANDBOX_TEST !== "1")("physical and Multi-Link isolated sandbox", () => {
  it("checks real Stripe totals and payment lifecycle, plus isolated paid-order persistence and fulfillment guard", async () => {
    const url = process.env.REVIEWS_JOURNEY_DATABASE_URL!;
    if (new URL(url).hostname !== "ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech" || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw Error("Isolated QA and test Stripe required");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    expect((await stripe.accounts.retrieve(null)).id).toBe("acct_1U1TpVJEgI4VUlPP");
    const sql = neon(url), client = createNeonSupabaseAdapterFromUrl(url);
    const sessions: Stripe.Checkout.Session[] = [], productIds: string[] = [];
    let intent: Stripe.PaymentIntent | undefined, sub: Stripe.Subscription | undefined, stripeCustomer: string | undefined, lifecycleProduct: string | undefined;
    const email = `physical-${randomUUID()}@example.test`;
    const sessionId = `cs_test_handler_${randomUUID()}`;
    try {
      const cart = validateCheckoutCart([customStandItem()], migratedProducts);
      expect(cart).toMatchObject({ ok: true, totalCents: 4900, recurringTotalCents: 0, checkoutMode: "payment" });
      if (!cart.ok) throw Error(cart.message);
      const direct = await stripe.checkout.sessions.create({ mode: "payment", line_items: buildStripeCheckoutLineItems(cart.rows), success_url: "http://localhost:3000/checkout/success", cancel_url: "http://localhost:3000/cart", metadata: { qa_only: "launch-audit" } });
      sessions.push(direct);
      expect(direct).toMatchObject({ livemode: false, amount_total: 4900, payment_status: "unpaid" });
      const directLines = await stripe.checkout.sessions.listLineItems(direct.id);
      expect(directLines.data).toHaveLength(1); expect(directLines.data[0].price?.recurring).toBeNull();
      productIds.push(String(directLines.data[0].price?.product));
      const address = { name: "Sandbox fixture", line1: "1 Test Street", line2: "", city: "Test", state: "VA", postalCode: "23219", country: "US" as const, phone: "" };
      expect(await createPendingOrderForCheckoutWithClient(client, { stripeCheckoutSessionId: sessionId, rows: cart.rows, subtotalCents: 4900, totalCents: 4900, currency: "usd", customer: { email, name: "Sandbox fixture", phone: "", createAccount: false }, shippingAddress: address, shippingMode: "free" })).toMatchObject({ ok: true });
      expect(await savePaidOrderFromCheckoutSessionWithClient(client, { id: sessionId, payment_status: "unpaid" })).toMatchObject({ ok: false });
      intent = await stripe.paymentIntents.create({ amount: 4900, currency: "usd", payment_method: "pm_card_visa", payment_method_types: ["card"], confirm: true, metadata: { qa_only: "launch-audit" } });
      expect(intent).toMatchObject({ livemode: false, status: "succeeded", amount_received: 4900 });
      // Explicit simulation: this is not a signed hosted-checkout webhook. The real test PI
      // drives a synthetic session payload to exercise the application's persistence helper.
      const payload = { id: sessionId, payment_status: "paid", payment_intent: intent.id, amount_total: intent.amount_received, currency: "usd", customer_details: { email, name: "Sandbox fixture" } };
      expect(await savePaidOrderFromCheckoutSessionWithClient(client, payload)).toMatchObject({ ok: true, wasAlreadyPaid: false });
      expect(await savePaidOrderFromCheckoutSessionWithClient(client, payload)).toMatchObject({ ok: true, wasAlreadyPaid: true });
      const [order] = await sql`SELECT * FROM orders WHERE stripe_checkout_session_id=${sessionId}`;
      expect(order.payment_status).toBe("paid"); expect(order.line_items_json).toHaveLength(1);
      const fulfillment = await updateOrderFulfillmentWithClient(client, order.id, { productionStatus: "ready_for_production", shippingStatus: "not_shipped", shippingMethod: "", shippingCarrier: "", trackingNumber: "", trackingUrl: "", internalNotes: "", adminFulfillmentNotes: "", markShipped: false });
      expect(fulfillment).toMatchObject({ ok: false, status: 409 });
      const growth = await sql`SELECT a.customer_id FROM customer_marketing_access a JOIN customers c ON c.id=a.customer_id WHERE c.email=${email}`;
      expect(growth).toHaveLength(0);
      const refund = await stripe.refunds.create({ payment_intent: intent.id }); expect(refund.status).toBe("succeeded");
      await expect(stripe.paymentIntents.create({ amount: 4900, currency: "usd", payment_method: "pm_card_chargeDeclined", payment_method_types: ["card"], confirm: true })).rejects.toMatchObject({ code: "card_declined" });
      const item = customStandItem("rate-your-experience-stand");
      item.setup.serviceMode = "HOSTED"; item.setup.serviceAddon = "hosted_multilink"; item.setup.hostedReservationId = randomUUID();
      const multi = validateCheckoutCart([item], migratedProducts);
      expect(multi).toMatchObject({ ok: true, totalCents: 4900, recurringTotalCents: 999, checkoutMode: "subscription" });
      if (!multi.ok) throw Error(multi.message);
      const hosted = await stripe.checkout.sessions.create({ mode: "subscription", line_items: buildStripeCheckoutLineItems(multi.rows), success_url: "http://localhost:3000/checkout/success", cancel_url: "http://localhost:3000/cart", metadata: { qa_only: "launch-audit" } });
      sessions.push(hosted); expect(hosted).toMatchObject({ livemode: false, amount_total: 5899 });
      const lines = await stripe.checkout.sessions.listLineItems(hosted.id); productIds.push(...lines.data.map(l => String(l.price?.product)));
      expect(lines.data.filter(l => !l.price?.recurring)).toHaveLength(1);
      expect(lines.data.find(l => l.price?.recurring)?.price).toMatchObject({ unit_amount: 999, recurring: { interval: "month" } });
      stripeCustomer = (await stripe.customers.create({ name: "Launch audit synthetic", payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } })).id;
      lifecycleProduct = (await stripe.products.create({name: "Multi-Link sandbox lifecycle fixture", metadata: {qa_only: "launch-audit"}})).id;
      sub = await stripe.subscriptions.create({ customer: stripeCustomer, items: [{ price_data: {product: lifecycleProduct, currency: "usd", unit_amount: 999, recurring: {interval: "month"}} }], metadata: { qa_only: "launch-audit" } });
      expect(sub.status).toBe("active");
      sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true }); expect(sub.cancel_at_period_end).toBe(true); expect(sub.status).toBe("active");
      sub = await stripe.subscriptions.cancel(sub.id); expect(sub.status).toBe("canceled");
    } finally {
      if (sub && sub.status !== "canceled") await stripe.subscriptions.cancel(sub.id);
      if (stripeCustomer) await stripe.customers.del(stripeCustomer);
      if (lifecycleProduct) await stripe.products.update(lifecycleProduct, { active: false });
      for (const s of sessions) await stripe.checkout.sessions.expire(s.id);
      await sql`DELETE FROM customer_stand_registry WHERE order_id IN (SELECT id FROM orders WHERE stripe_checkout_session_id=${sessionId})`;
      await sql`DELETE FROM orders WHERE stripe_checkout_session_id=${sessionId}`;
      await sql`DELETE FROM customers WHERE email=${email}`;
      expect(await sql`SELECT id FROM orders WHERE stripe_checkout_session_id=${sessionId}`).toHaveLength(0);
      for (const id of new Set(productIds)) await stripe.products.update(id, { metadata: { qa_only: "launch-audit", fixture_status: "finished" } });
    }
  }, 120000);
});
