import nextEnv from '@next/env';
import { writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const origin = 'https://taprater.com';
const orderId = '3c2bd7cc-7d2c-47f2-886e-a71e5b05aba5';
const sessionId = 'cs_test_b1yd1tuTqeMiZbXCHEIFPeNJWsjyUJa6xNdK75L2nNWIf2mGnEJL86lKNI';
const headers = { 'content-type': 'application/json', origin };
const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers,
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
if (!login.ok) throw new Error(`Admin login failed: ${login.status}`);
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
if (!cookie) throw new Error('Admin session was not issued.');
const auth = { ...headers, cookie };
const detail = await fetch(`${origin}/admin/orders/${orderId}`, { headers: auth });
const html = await detail.text();
if (!detail.ok || !html.includes(sessionId) || !html.includes('Phase 2 Recovery QA - Do Not Fulfill')) throw new Error('Dedicated test order not verified.');
const evidence = { checkedAt: new Date().toISOString(), orderId, sessionId, results: [] };
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
await writeFile(`artifacts/ecommerce-phase-2/release-${Date.now()}.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
if (evidence.smoke.some(item => item.status !== 200 || item.serverError) || unauthorized.status !== 401
  || evidence.results.some(item => item.status !== 200)) process.exitCode = 1;
