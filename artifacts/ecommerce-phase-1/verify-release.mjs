import nextEnv from '@next/env';
import { readFile, writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const origin = 'https://taprater.com';
const orderId = '615c3168-c81c-44b1-b249-c0b30028e332';
const sessionId = 'cs_test_b11qorE9rzbn7EUyaLrAL4MVyUv33bV9RYWkRcvNCpa8tdX7Kz2DO7YohO';
const headers = { 'content-type': 'application/json', origin };
const login = await fetch(`${origin}/api/admin/login`, {
  method: 'POST', headers,
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
if (!login.ok) throw new Error(`Admin login failed (${login.status}); no refund attempted.`);
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
if (!cookie) throw new Error('No admin session; no refund attempted.');
const authenticatedHeaders = { ...headers, cookie };
const detail = await fetch(`${origin}/admin/orders/${orderId}`, { headers: authenticatedHeaders });
const html = await detail.text();
if (!detail.ok || !html.includes(sessionId) || !html.includes('Phase 1 Release QA - Do Not Fulfill')) {
  throw new Error('Dedicated test order could not be verified; no refund attempted.');
}
const evidence = { checkedAt: new Date().toISOString(), orderId, sessionId, adminDetailStatus: detail.status, refund: null, smoke: [] };
const previous = await readFile('artifacts/ecommerce-phase-1/release-verification.json', 'utf8').then(JSON.parse).catch(() => null);
evidence.previousRuns = previous ? [...(previous.previousRuns ?? []), { checkedAt: previous.checkedAt, refund: previous.refund }] : [];
if (process.argv.includes('--refund-dedicated-test-order')) {
  const result = await fetch(`${origin}/api/admin/orders/${orderId}/refund`, {
    method: 'POST', headers: authenticatedHeaders, body: JSON.stringify({ confirmation: 'REFUND' }),
  });
  const body = await result.json();
  evidence.refund = { httpStatus: result.status, ...body };
  if (!result.ok) throw new Error(`Dedicated test refund failed (${result.status}): ${body.error}`);
}
const refreshedDetail = await fetch(`${origin}/admin/orders/${orderId}`, { headers: authenticatedHeaders });
const refreshedHtml = await refreshedDetail.text();
evidence.refundControls = {
  showsRefunded: refreshedHtml.includes('Refunded'),
  showsFulfillmentHold: refreshedHtml.includes('This order has a refund. Production and shipping are locked.'),
  showsRefundAction: refreshedHtml.includes('Refund full charge'),
};
const unauthorized = await fetch(`${origin}/api/admin/orders/${orderId}/refund`, {
  method: 'POST', headers, body: JSON.stringify({ confirmation: 'REFUND' }),
});
evidence.unauthenticatedRefundStatus = unauthorized.status;
for (const path of ['/', '/shop', '/product/google-review-stand', '/cart', '/checkout', '/account/login', '/admin/orders', `/admin/orders/${orderId}`]) {
  const response = await fetch(`${origin}${path}`, { headers: path.startsWith('/admin/') ? authenticatedHeaders : undefined });
  const body = await response.text();
  evidence.smoke.push({ path, status: response.status, serverError: body.includes('Application error: a server-side exception') });
}
await writeFile('artifacts/ecommerce-phase-1/release-verification.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (evidence.smoke.some(result => result.status !== 200 || result.serverError)
  || !evidence.refundControls.showsRefunded || !evidence.refundControls.showsFulfillmentHold
  || evidence.refundControls.showsRefundAction || ![401, 403].includes(unauthorized.status)) process.exitCode = 1;
