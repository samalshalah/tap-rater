import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

nextEnv.loadEnvConfig(process.cwd());
const origin = 'https://taprater.com';
const orderId = '176806a8-8709-4ac9-acbb-eb2805585bce';
const sessionId = 'cs_test_b1vLp3qQURrLngr3QBoJYMLD9sZpT0YysLNHq1hhz0mVJinHNOQy9J0rb4';
const name = 'Phase 3 Operations QA - Do Not Fulfill';
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
const readOrder = async () => (await sql`SELECT id, stripe_checkout_session_id, customer_name, status, payment_status, production_status, shipping_status, shipped_at, tracking_number, total_cents, stripe_refund_id, refund_status FROM orders WHERE id = ${orderId}`)[0];
const before = await readOrder();
assert.equal(before?.stripe_checkout_session_id, sessionId);
assert.equal(before.customer_name, name);
assert.equal(before.total_cents, 5334);
assert.ok(sessionId.startsWith('cs_test_'));
const headers = { 'content-type': 'application/json', origin };
const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
assert.equal(login.status, 200, 'Admin login');
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert.ok(cookie, 'Admin session');
const auth = { ...headers, cookie };
const evidence = { checkedAt: new Date().toISOString(), release: 'f7c4fd2c-9b4a-40f5-a9e3-55fd9038a614', orderId, sessionId, before, operations: [] };
async function action(label, path, body, expectedStatus = 200, method = 'POST', authenticated = true) {
  const response = await fetch(`${origin}${path}`, { method, headers: authenticated ? auth : headers, body: JSON.stringify(body) });
  const result = await response.json();
  evidence.operations.push({ label, status: response.status, result });
  assert.equal(response.status, expectedStatus, `${label}: ${JSON.stringify(result)}`);
  return result;
}
const fulfillmentPath = `/api/admin/orders/${orderId}/fulfillment`;
const base = { productionStatus: 'not_started', shippingStatus: 'not_shipped', shippingMethod: 'QA simulation - no physical shipment', shippingCarrier: 'QA TEST ONLY', trackingNumber: 'PHASE3-TEST-NOT-A-PARCEL', trackingUrl: '', internalNotes: 'Phase 3 operating drill. Test payment only. Do not manufacture or ship.', adminFulfillmentNotes: 'Simulated fulfillment for QA. No carrier handoff.', markShipped: false };
try {
  if (process.argv.includes('--checkout-guards')) {
    const product = (await sql`SELECT supports_multilink FROM products WHERE slug = 'google-review-stand'`)[0];
    assert.equal(product.supports_multilink, false, 'Use a product with Multi-Link unavailable');
    const payload = { checkoutAttemptId: 'phase3-disabled-multilink-001', items: [{ productId: 'google-review-stand', optionId: 'standard_direct', quantity: 1,
      setup: { serviceAddon: 'hosted_multilink', serviceMode: 'HOSTED', destinationUrl: 'https://search.google.com/local/writereview?placeid=Phase3OperationsQA' } }],
      customer: { name, email: 'info@horizonlight.us', phone: '2025550142', createAccount: false },
      shippingAddress: { name: 'Phase 3 Test Only', line1: '100 Test Street', line2: '', city: 'Richmond', state: 'VA', postalCode: '23219', country: 'US', phone: '2025550142' } };
    await action('reject unavailable Multi-Link in stale cart', '/api/checkout', payload, 400, 'POST', false);
    await action('reject whole cart with an unavailable line', '/api/checkout', { ...payload, checkoutAttemptId: 'phase3-partial-cart-001', items: [
      { ...payload.items[0], setup: { destinationUrl: payload.items[0].setup.destinationUrl } },
      { productId: 'phase3-unavailable-product', optionId: 'standard_direct', quantity: 1, setup: { destinationUrl: 'https://example.com' } }
    ] }, 400, 'POST', false);
  }
  if (process.argv.includes('--fulfill')) {
    assert.equal(before.payment_status, 'paid');
    assert.equal(before.shipping_status, 'not_shipped', 'Refusing to repeat first shipment');
    await action('reject premature shipment', fulfillmentPath, { ...base, shippingStatus: 'shipped' }, 409);
    await action('production ready', fulfillmentPath, { ...base, productionStatus: 'ready_for_production' });
    await action('production in progress', fulfillmentPath, { ...base, productionStatus: 'in_production' });
    await action('production complete', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'ready_to_ship' });
    const shipped = await action('first shipment', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'shipped' });
    assert.equal(shipped.shippingEmail?.sent, true, 'Shipping email provider acceptance');
    const firstShippedAt = (await readOrder()).shipped_at;
    assert.ok(firstShippedAt);
    await action('shipment blocked', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'blocked' });
    await action('reject shipment rollback', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'not_shipped' }, 409);
    await action('reject post-shipment production', fulfillmentPath, { ...base, productionStatus: 'in_production', shippingStatus: 'blocked' }, 409);
    const resumed = await action('resume shipped without another email', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'shipped' });
    assert.equal(resumed.shippingEmail, undefined);
    await action('delivered', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'delivered' });
    assert.equal(new Date((await readOrder()).shipped_at).toISOString(), new Date(firstShippedAt).toISOString());
    await action('reject delivered rollback', fulfillmentPath, { ...base, productionStatus: 'completed', shippingStatus: 'shipped' }, 409);
  }
  if (process.argv.includes('--support')) {
    const message = `Phase 3 test-only support drill for order ${orderId}. Simulate a refund request; no real product or payment. Submitted by an AI assistant on the owner's instructions.`;
    let requests = await sql`SELECT id FROM contact_requests WHERE name = ${name} AND message = ${message}`;
    if (!requests.length) {
      await action('public support request', '/api/forms/contact', { name, email: 'info@horizonlight.us', message }, 200, 'POST', false);
      requests = await sql`SELECT id FROM contact_requests WHERE name = ${name} AND message = ${message}`;
    }
    assert.equal(requests.length, 1);
    const requestId = requests[0].id;
    await action('support in progress', `/api/admin/requests/contact/${requestId}`, { status: 'in_progress', adminNotes: `QA only: investigating order ${orderId}.` }, 200, 'PATCH');
    await action('support resolved', `/api/admin/requests/contact/${requestId}`, { status: 'resolved', adminNotes: `QA only: operating drill complete; test order ${orderId} will be fully refunded.` }, 200, 'PATCH');
    evidence.support = (await sql`SELECT id, status, resolved_at FROM contact_requests WHERE id = ${requestId}`)[0];
    assert.equal(evidence.support.status, 'resolved');
    assert.ok(evidence.support.resolved_at);
  }
  if (process.argv.includes('--refund')) {
    await action('dedicated test refund', `/api/admin/orders/${orderId}/refund`, { confirmation: 'REFUND' });
    await action('post-refund production remains locked', fulfillmentPath, { ...base, productionStatus: 'in_production', shippingStatus: 'blocked' }, 409);
  }
  await action('unauthenticated fulfillment rejected', fulfillmentPath, base, 401, 'POST', false);
  evidence.after = await readOrder();
  evidence.invoices = await sql`SELECT stripe_invoice_id, status, total_cents FROM billing_invoices WHERE order_id = ${orderId}`;
  evidence.recovery = await sql`SELECT kind, status, attempts, last_error FROM commerce_recovery_jobs WHERE object_id = ${sessionId} OR object_id IN (SELECT stripe_invoice_id FROM billing_invoices WHERE order_id = ${orderId})`;
  evidence.emails = await sql`SELECT message_type, status, attempt_number, accepted_at FROM email_deliveries WHERE entity_id = ${orderId} ORDER BY created_at`;
  evidence.smoke = [];
  for (const path of ['/', '/shop', '/product/google-review-stand', '/cart', '/checkout', '/admin/products', `/admin/orders/${orderId}`, '/admin/inventory', '/admin/requests', '/admin/settings/emails']) {
    const response = await fetch(`${origin}${path}`, { headers: path.startsWith('/admin') ? auth : undefined });
    const text = await response.text();
    const serverError = text.includes('Application error: a server-side exception');
    evidence.smoke.push({ path, status: response.status, serverError });
    assert.equal(response.status, 200, path);
    assert.equal(serverError, false, path);
  }
} finally {
  await writeFile(`artifacts/ecommerce-phase-3/operations-${Date.now()}.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}
