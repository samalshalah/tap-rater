import nextEnv from '@next/env';
import { writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const origin = 'https://taprater.com';
const cases = {
  initial: {
    orderId: '2b2352db-d8c0-4e16-bbac-5c38df03bbe8',
    sessionId: 'cs_test_b1Y5AR6S3Mlt2m7CBsOvaIyDsBuHBeTVJty3mmwitaxp5p87VCW4gnKwzQ',
    name: 'Phase 2 First Pass QA - Do Not Fulfill',
  },
  final: {
    orderId: '35cf3d65-70dd-4f0b-8c62-73dcd2f5a4ff',
    sessionId: 'cs_test_b1d97WSkPqNOcj7nwrZoFYOcnUux9j6HnTFzrEsEBG5YNufbI6jKzZYKPl',
    name: 'Phase 2 Paid Runtime QA - Do Not Fulfill',
  },
};
const selected = process.argv.find(arg => arg.startsWith('--case='))?.slice(7) ?? 'initial';
const test = cases[selected];
if (!test || !test.sessionId.startsWith('cs_test_')) throw new Error('Unknown dedicated test case.');
const { orderId, sessionId, name } = test;
const headers = { 'content-type': 'application/json', origin };
const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers,
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
if (!login.ok) throw new Error(`Admin login failed: ${login.status}`);
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
if (!cookie) throw new Error('Admin session was not issued.');
const auth = { ...headers, cookie };
const detail = await fetch(`${origin}/admin/orders/${orderId}`, { headers: auth });
const html = await detail.text();
if (!detail.ok || !html.includes(sessionId) || !html.includes(name)) throw new Error('Dedicated test order not verified.');
const evidence = { checkedAt: new Date().toISOString(), selected, orderId, sessionId, results: [] };
if (process.argv.includes('--retry')) {
  const response = await fetch(`${origin}/api/admin/commerce-recovery`, { method: 'POST', headers: auth,
    body: JSON.stringify({ id: `test:checkout:${sessionId}` }) });
  evidence.results.push({ operation: 'retry_dedicated_test', status: response.status, body: await response.json() });
}
if (process.argv.includes('--refund')) {
  const response = await fetch(`${origin}/api/admin/orders/${orderId}/refund`, { method: 'POST', headers: auth,
    body: JSON.stringify({ confirmation: 'REFUND' }) });
  evidence.results.push({ operation: 'refund_dedicated_test', status: response.status, body: await response.json() });
}
const unauthorized = await fetch(`${origin}/api/admin/commerce-recovery`, { method: 'POST', headers,
  body: JSON.stringify({ id: `test:checkout:${sessionId}` }) });
evidence.unauthenticatedRetryStatus = unauthorized.status;
evidence.smoke = [];
for (const path of ['/', '/shop', '/product/google-review-stand', '/cart', '/checkout', '/account/login', '/admin/settings/emails']) {
  const response = await fetch(`${origin}${path}`, { headers: path.startsWith('/admin') ? auth : undefined });
  const content = await response.text();
  evidence.smoke.push({ path, status: response.status, serverError: content.includes('Application error: a server-side exception'),
    ...(path.endsWith('/emails') ? { recoveryPanel: content.includes('Payment recovery'), emptyQueue: content.includes('No outstanding payment recovery tasks.') } : {}) });
}
await writeFile(`artifacts/ecommerce-phase-2/paid-runtime-${Date.now()}.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (evidence.smoke.some(item => item.status !== 200 || item.serverError) || unauthorized.status !== 401
  || evidence.results.some(item => item.status !== 200)) process.exitCode = 1;
