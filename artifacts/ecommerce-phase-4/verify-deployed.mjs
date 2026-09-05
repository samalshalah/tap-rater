import nextEnv from '@next/env';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const origin = 'https://taprater.com';
const headers = { 'content-type': 'application/json', origin };
const evidence = { checkedAt: new Date().toISOString(), release: process.argv.find(value => value.startsWith('--release='))?.slice(10), checks: [] };
const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', headers, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
assert.equal(login.status, 200, 'Admin login must work after session upgrade');
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert.ok(cookie);
const auth = { ...headers, cookie };

async function call(method, body, customHeaders = auth, expected = 200) {
  const response = await fetch(`${origin}/api/admin/recovery`, { method, headers: customHeaders, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  assert.equal(response.status, expected, `Recovery ${method}: ${JSON.stringify(result)}`);
  return result;
}

await call('GET', null, headers, 401);
await call('POST', { action: 'drill' }, headers, 401);
evidence.checks.push('Unauthenticated recovery reads and writes return 401');
const status = await call('GET');
assert.equal(status.customerSecretSeparated, true);
assert.equal(status.stripeMode, 'test');
assert.equal(status.databaseHost, new URL(process.env.DATABASE_URL).hostname);
evidence.runtime = status;

const session = decodeURIComponent(cookie.split('taprater_admin=')[1]?.split(';')[0] ?? '');
const separator = session.lastIndexOf('.');
const signature = value => createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(value).digest('hex');
assert.equal(signature(session.slice(0, separator)), session.slice(separator + 1), 'Confirm local signer matches this authenticated deployed session before negative tests');
for (const payload of [
  `${process.env.ADMIN_EMAIL}:${Date.now()}`,
  `v2:customer-session:${process.env.ADMIN_EMAIL}:${Date.now()}`,
  `v2:customer-login:${process.env.ADMIN_EMAIL}:${Date.now()}`,
  `v2:admin-session:phase4-not-admin@example.com:${Date.now()}`
]) {
  await call('GET', null, { ...headers, cookie: `taprater_admin=${encodeURIComponent(`${payload}.${signature(payload)}`)}` }, 401);
}
evidence.checks.push('Correctly signed legacy, wrong-purpose, and wrong-admin-identity cookies return 401');

if (process.argv.includes('--backup')) {
  for (let batch = 0; batch < 100; batch++) {
    const result = await call('POST', { action: 'backup' });
    if (result.completedAt) { evidence.backup = result; break; }
    if (result.leaseUntil > Date.now()) throw new Error('Another backup is running; retry this verifier after its lease completes.');
  }
  assert.ok(evidence.backup?.completedAt, 'All media backup batches must finish');
}
if (process.argv.includes('--drill')) {
  evidence.mediaDrill = await call('POST', { action: 'drill' });
  assert.equal(evidence.mediaDrill.ok, true);
  assert.equal(evidence.mediaDrill.originalRemoved, true);
  assert.equal(evidence.mediaDrill.metadataVerified, true);
}
for (const path of ['/', '/product/google-review-stand', '/cart', '/account/login', '/admin/login']) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, path);
  evidence.checks.push(`${path}: 200`);
  await response.body?.cancel();
}
await mkdir('artifacts/ecommerce-phase-4', { recursive: true });
await writeFile(`artifacts/ecommerce-phase-4/deployed-${Date.now()}.json`, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
