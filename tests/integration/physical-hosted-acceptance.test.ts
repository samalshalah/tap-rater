import { randomUUID, randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";
import sharp from "sharp";
import { it, expect, vi } from "vitest";

// Only the final mail-provider transport is replaced. Actual templates, encrypted
// outbox, database locks, proof storage, artwork, billing and webhook handlers run.
const mail = vi.hoisted(() => vi.fn(async (_message: any) => ({ sent: true as const })));
vi.mock("@/lib/email", async (original) => ({ ...await original<typeof import("@/lib/email")>(), sendEmail: mail }));
import { migratedProducts } from "@/data/migrated-products";
import { uploadProductMedia } from "@/lib/admin-media-storage";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { createBrandedProof, verifyBrandedCheckoutProofs, reserveBrandedHostedDestination, bindBrandedHostedCheckout } from "@/lib/branded-proof";
import { validateCheckoutCart, buildStripeCheckoutLineItems } from "@/lib/checkout";
import { createPendingOrderForCheckoutWithClient, updateOrderFulfillmentWithClient } from "@/lib/orders";
import { createNeonSupabaseAdapterFromUrl } from "@/lib/neon-supabase-adapter";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { activateCustomerAccountWithClient } from "@/lib/customer-account";
import { activateDeviceWithClient, hashActivationCode } from "@/lib/device-activation";
import { getDeviceRedirectAction } from "@/lib/device-redirect";

it.skipIf(process.env.PHYSICAL_HOSTED_TEST !== "1")("real hosted physical payment and signed fulfillment pipeline on isolated QA", async () => {
 const url = process.env.REVIEWS_JOURNEY_DATABASE_URL!;
 if (new URL(url).hostname !== "ep-cold-voice-atmq1yn4-pooler.c-9.us-east-1.aws.neon.tech" || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw Error("Dedicated QA and Stripe test keys required");
 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); expect((await stripe.accounts.retrieve(null)).id).toBe("acct_1U1TpVJEgI4VUlPP");
 const resume = process.env.PHYSICAL_RESUME === "1" ? JSON.parse(readFileSync(".local-sandbox/physical-hosted.json", "utf8")) : null;
 const uid = resume?.fixture || randomUUID(), multi = process.env.PHYSICAL_HOSTED_VARIANT === "multilink", email = `physical-hosted-${uid}@example.test`, attempt = randomUUID();
 const disk = resolve(".local-sandbox", `physical-${uid}`), sql = neon(url), client = createNeonSupabaseAdapterFromUrl(url);
 Object.assign(process.env, { DATABASE_URL: url, NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", STRIPE_MODE: "test", STRIPE_WEBHOOK_SECRET: readFileSync(".local-sandbox/reviews-webhook-secret", "utf8").trim(), COMMERCE_RECOVERY_SECRET: randomBytes(32).toString("hex"), CUSTOMER_SESSION_SECRET: randomBytes(32).toString("hex"), TAP_RATER_LOCAL_PRODUCT_MEDIA_DIR: disk + "/media", TAP_RATER_LOCAL_HOSTED_PAGES_DIR: disk + "/hosted", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4183", NEXT_PUBLIC_ACCOUNT_APP_URL: "https://physical-qa.example.test", ORDER_NOTIFICATION_EMAIL: "qa-admin@example.test", RESEND_API_KEY: "", GOOGLE_REVIEWS_PUBLISHING_ENABLED: "false" });
 mkdirSync(disk, { recursive: true });
 const evidence: any = { ...resume, stage: "preparing", fixture: uid, variant: multi ? "multilink" : "direct", mailTransport: "simulated local sink", physicalManufacturing: "not performed", storage: "local disk only", disk };
 const events: any[] = []; let session: Stripe.Checkout.Session | undefined, orderId = "", customerId = "", stripeCustomer = "", subscriptionId = "", deviceId = "", deviceCode = "", queue = Promise.resolve(), captured: { body: string; signature: string } | undefined;
 const save = () => writeFileSync(".local-sandbox/physical-hosted.json", JSON.stringify({ ...evidence, events }, null, 2));
 const wait = async (check: () => Promise<boolean>, label: string) => { const end = Date.now() + 600000; while (Date.now() < end) { if (await check()) return; await new Promise(r => setTimeout(r, 1000)); } throw Error("Timed out: " + label); };
 const server = createServer(async (req, res) => {
  if (req.url !== "/webhook") { res.setHeader("Content-Type", "text/html"); res.end("<h1>Tap Rater physical sandbox</h1><p>Payment returned. Signed payment and local print-artwork checks are running. No real shipment.</p>"); return; }
  let raw = ""; for await (const chunk of req) raw += chunk;
  const event = JSON.parse(raw), obj = event.data?.object;
  const own = obj?.id === session?.id || obj?.metadata?.qa_fixture === uid || obj?.parent?.subscription_details?.metadata?.qa_fixture === uid || (stripeCustomer && obj?.customer === stripeCustomer);
  if (!own) { res.end("Ignored unrelated sandbox event"); return; }
  queue = queue.then(async () => { const signature = String(req.headers["stripe-signature"] || ""); const result = await webhook(new Request("http://127.0.0.1:4183/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": signature }, body: raw })); const body = await result.text(); events.push({ id: event.id, type: event.type, status: result.status, response: body }); if (event.type === "checkout.session.completed") captured = { body: raw, signature }; save(); res.statusCode = result.status; res.end(body); }).catch(e => { evidence.processingError = String(e); save(); res.statusCode = 500; res.end("QA processing error"); });
 });
 await new Promise<void>(r => server.listen(4183, "127.0.0.1", r));
 try {
  let reservation: any;
  if (resume) { session = await stripe.checkout.sessions.retrieve(resume.sessionId); orderId = resume.orderId; events.push(...resume.events); evidence.resumedAfterHarnessShutdown = true; } else {
  const product = migratedProducts.find(p => p.slug === (multi ? "rate-your-experience-stand" : "google-review-stand"))!;
  const png = await sharp({ create: { width: 1200, height: 1200, channels: 4, background: "#6035ff" } }).png().toBuffer();
  writeFileSync(disk + "/synthetic-logo.png", png);
  const logo = await uploadProductMedia({ file: new File([new Uint8Array(png)], "sandbox-logo.png", { type: "image/png" }), productSlug: "customer-setup-" + product.slug, role: "center_asset" });
  const storage = (await getHostedPageStorage())!;
  reservation = multi ? await reserveBrandedHostedDestination(product.slug, storage, "http://127.0.0.1:4183") : undefined;
  const setup: any = { productSlug: product.slug, optionCode: "branded_qr_direct", businessName: "Sandbox Print Fixture", logoStorageKey: logo.storageKey, logoMediaUrl: logo.url, destinationUrl: multi ? undefined : "https://example.com/sandbox-review", ...(multi ? { serviceMode: "HOSTED", serviceAddon: "hosted_multilink", hostedReservationId: reservation!.id, multiLinkButtons: [{ id: "link-1", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 0 }] } : {}) };
  const proof = await createBrandedProof(product, setup, storage);
  const item = { productId: product.slug, optionId: "branded_qr_direct" as const, quantity: 1, setup: { ...setup, ...proof.snapshot, optionCode: "branded_qr_direct" as const, proofReceiptId: proof.proofReceiptId, proofApproved: true, proofApprovalSnapshot: proof.snapshot } };
  writeFileSync(disk + "/proof.svg", proof.svg);
  const cart = validateCheckoutCart([item], migratedProducts); expect(cart.ok).toBe(true); if (!cart.ok) throw Error(cart.message);
  await verifyBrandedCheckoutProofs(cart.rows, attempt, storage);
  evidence.proofVerified = true; evidence.priceScope = "Base price fixture; excludes current promotional offers/shipping/tax";
  const params: Stripe.Checkout.SessionCreateParams = { mode: multi ? "subscription" : "payment", customer_email: email, line_items: buildStripeCheckoutLineItems(cart.rows), success_url: "http://127.0.0.1:4183/success", cancel_url: "http://127.0.0.1:4183/cancel", metadata: { qa_fixture: uid, checkout_intent: multi ? "hosted_subscription" : "direct_payment", create_account: "true", stripe_mode: "test" }, ...(multi ? { subscription_data: { metadata: { qa_fixture: uid, tap_rater: "hosted_multilink" } } } : { customer_creation: "always", payment_intent_data: { metadata: { qa_fixture: uid } }, invoice_creation: { enabled: true, invoice_data: { metadata: { qa_fixture: uid } } } }) };
  session = await stripe.checkout.sessions.create(params, { idempotencyKey: attempt }); expect(session.livemode).toBe(false); expect(session.amount_total).toBe(multi ? 5899 : 4900);
  if (multi) await bindBrandedHostedCheckout(cart.rows, session.id, storage);
  const pending = await createPendingOrderForCheckoutWithClient(client, { stripeCheckoutSessionId: session.id, rows: cart.rows, subtotalCents: cart.totalCents, totalCents: session.amount_total!, currency: "usd", customer: { email, name: "Sandbox Print Fixture", phone: "", createAccount: true }, shippingAddress: { name: "Sandbox Print Fixture", line1: "1 Test Street", line2: "", city: "Test", state: "VA", postalCode: "23219", country: "US", phone: "" }, shippingMode: "free" }); expect(pending).toMatchObject({ ok: true });
  [{ id: orderId }] = await sql`SELECT id FROM orders WHERE stripe_checkout_session_id=${session.id}`;
  Object.assign(evidence, { stage: "awaiting_payment", checkoutUrl: session.url, sessionId: session.id, orderId, dueToday: session.amount_total }); save();
  }
  await wait(async () => events.some(e => e.type === "checkout.session.completed" && e.status === 200), "signed completed physical checkout"); await queue;
  const paid = await stripe.checkout.sessions.retrieve(session.id, { expand: ["subscription"] }); expect(paid.payment_status).toBe("paid"); stripeCustomer = typeof paid.customer === "string" ? paid.customer : paid.customer!.id; subscriptionId = typeof paid.subscription === "string" ? paid.subscription : paid.subscription?.id || "";
  const [order] = await sql`SELECT * FROM orders WHERE id=${orderId}`; expect(order.payment_status).toBe("paid"); expect(order.production_status).toBe("ready_for_production");
  const art = order.line_items_json[0].setup.productionArtwork; expect(art.status).toBe("generated"); expect(readFileSync(disk + "/media/" + art.storageKey, "utf8")).toContain("<svg");
  evidence.generatedArtwork = { storageKey: art.storageKey, dpi: art.dpi, widthPx: art.widthPx, heightPx: art.heightPx };
  save();
  if (!resume) {
  const callsBefore = mail.mock.calls.length;
  expect(captured).toBeDefined(); const replay = await webhook(new Request("http://127.0.0.1:4183/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": captured!.signature }, body: captured!.body })); expect(replay.status).toBe(200); expect(mail.mock.calls.length).toBe(callsBefore); evidence.signedReplayPassed = true;
  const activationMail = mail.mock.calls.map(c => c[0]).find(m => /account\/activate\?token=/.test(m.html)); expect(activationMail).toBeDefined();
  const token = decodeURIComponent(activationMail.html.match(/account\/activate\?token=([^"&<]+)/)[1]);
  expect(await activateCustomerAccountWithClient(client, token, randomUUID())).toMatchObject({ ok: true, email }); evidence.accountActivationPassed = true;
  } else evidence.activationAndReplay = "original in-memory capture unavailable after interrupted harness; covered in other browser fixtures";
  save();
  [{ id: customerId }] = await sql`SELECT id FROM customers WHERE email=${email}`;
  expect(await sql`SELECT customer_id FROM customer_marketing_access WHERE customer_id=${customerId}`).toHaveLength(0);
  for (const [productionStatus, shippingStatus] of [["in_production", "not_shipped"], ["completed", "ready_to_ship"]] as const) expect(await updateOrderFulfillmentWithClient(client, orderId, { productionStatus, shippingStatus, shippingMethod: "QA simulation only", shippingCarrier: "", trackingNumber: "", trackingUrl: "", internalNotes: "No physical printing or shipment", adminFulfillmentNotes: "Sandbox state-transition test", markShipped: false })).toMatchObject({ ok: true });
  evidence.fulfillmentStatePassed = "ready_to_ship; simulated production only";
  if (multi) { const [hosted] = await sql`SELECT * FROM hosted_subscriptions WHERE order_id=${orderId}`; expect(hosted.status).toBe("active"); expect(hosted.permanent_code).toBe(reservation!.code); expect(order.line_items_json[0].setup.generatedQrValue).toBe(reservation!.url); evidence.hostedProvisioningPassed = true; }
  deviceCode = "QA-" + uid.toUpperCase(); const privateCode = randomUUID();
  [{ id: deviceId }] = await sql`INSERT INTO devices(device_code,activation_code_hash,status,product_type,service_mode) VALUES(${deviceCode},${hashActivationCode(privateCode)},'unactivated','custom_url','basic_redirect') RETURNING id`;
  const destination = reservation?.url || "https://example.com/sandbox-review";
  expect(await activateDeviceWithClient(client, { deviceCode, activationCode: privateCode, email, name: "Sandbox Print Fixture", businessName: "Sandbox Print Fixture", destinationType: "direct_url", destinationUrl: destination })).toMatchObject({ ok: true });
  const [device] = await sql`SELECT * FROM devices WHERE id=${deviceId}`;
  expect(getDeviceRedirectAction({ id: device.id, deviceCode, productType: device.product_type, serviceMode: device.service_mode, status: device.status, destinationUrl: device.destination_url })).toMatchObject({ type: "redirect", destinationUrl: destination }); evidence.syntheticDeviceActivationPassed = true;
  evidence.emailMessages = mail.mock.calls.map(c => ({ to: c[0].to, subject: c[0].subject, attachmentCount: c[0].attachments?.length || 0 }));
  evidence.stage = "passed"; save();
 } catch (error) { evidence.stage = "failed"; evidence.error = String(error); save(); throw error; } finally {
  await queue;
  if (session) { const current = await stripe.checkout.sessions.retrieve(session.id); stripeCustomer ||= typeof current.customer === "string" ? current.customer : current.customer?.id || ""; subscriptionId ||= typeof current.subscription === "string" ? current.subscription : current.subscription?.id || ""; if (current.status === "open") await stripe.checkout.sessions.expire(current.id); if (current.payment_intent && !multi && (await stripe.refunds.list({ payment_intent: typeof current.payment_intent === "string" ? current.payment_intent : current.payment_intent.id })).data.length === 0) await stripe.refunds.create({ payment_intent: typeof current.payment_intent === "string" ? current.payment_intent : current.payment_intent.id }); }
  if (subscriptionId) { const sub = await stripe.subscriptions.retrieve(subscriptionId); if (sub.status !== "canceled") await stripe.subscriptions.cancel(subscriptionId); }
  await queue; server.closeAllConnections(); server.close();
  evidence.customerId = customerId; evidence.subscriptionId = subscriptionId; evidence.orderId = orderId; save();
  // Retain exact UUID fixtures on failure for diagnosis. Success cleanup is scoped to this order/customer/device only.
  if (evidence.stage === "passed") {
   if (deviceCode) await sql`DELETE FROM device_activation_attempts WHERE device_code=${deviceCode}`;
   if (deviceId) await sql`DELETE FROM customer_stand_registry WHERE device_id=${deviceId}`;
   if (deviceId) await sql`DELETE FROM devices WHERE id=${deviceId}`;
   await sql`DELETE FROM customer_stand_registry WHERE order_id=${orderId}`;
   await sql`DELETE FROM hosted_subscriptions WHERE order_id=${orderId}`;
   await sql`DELETE FROM billing_invoices WHERE order_id=${orderId}`;
   await sql`DELETE FROM orders WHERE id=${orderId} AND email=${email}`;
   await sql`DELETE FROM hosted_page_editor_pages WHERE business_id IN (SELECT id FROM businesses WHERE customer_id=${customerId})`;
   await sql`DELETE FROM businesses WHERE customer_id=${customerId}`;
   await sql`DELETE FROM customers WHERE id=${customerId} AND email=${email}`;
   if (stripeCustomer) await stripe.customers.del(stripeCustomer);
   expect(await sql`SELECT id FROM orders WHERE id=${orderId}`).toHaveLength(0); evidence.cleanupPassed = true; save();
  }
 }
}, 1300000);
