import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const appConfigPaths = ["wrangler.jsonc", "wrangler.cloudflare-git.jsonc"];
const appConfigs = appConfigPaths.map(readJsonConfig);
let checks = 0;

assert(appConfigs[0].name === appConfigs[1].name, "Application Worker names must match.");
assert(appConfigs[0].main === appConfigs[1].main, "Application Worker entrypoints must match.");
assert(appConfigs[0].compatibility_date === appConfigs[1].compatibility_date, "Application compatibility dates must match.");
assert(appConfigs[0].compatibility_date >= "2026-09-05", "Application compatibility date is stale.");

for (const [index, config] of appConfigs.entries()) {
  const label = appConfigPaths[index];
  assert(config.observability?.enabled === true, `${label} must enable observability.`);
  assert(hasRoute(config, "taprater.com/*"), `${label} must route taprater.com.`);
  assert(hasRoute(config, "www.taprater.com/*"), `${label} must route www.taprater.com.`);
  assert(hasBinding(config.r2_buckets, "PRODUCT_MEDIA_BUCKET"), `${label} is missing product media storage.`);
  assert(hasBinding(config.r2_buckets, "HOSTED_PAGE_SNAPSHOTS"), `${label} is missing hosted-page snapshot storage.`);
  assert(hasRateLimit(config, "PUBLIC_FORM_RATE_LIMITER", 10), `${label} is missing the public form rate limit.`);
  assert(hasRateLimit(config, "PUBLIC_CHECKOUT_RATE_LIMITER", 10), `${label} is missing the checkout rate limit.`);
  assert(hasRateLimit(config, "PUBLIC_EVENT_RATE_LIMITER", 120), `${label} is missing the public event rate limit.`);
}

for (const path of [
  "workers/hosted-pages/wrangler.jsonc",
  "workers/hosted-pages/wrangler.activation.jsonc",
  "workers/hosted-pages/wrangler.qa.jsonc"
]) {
  const config = readJsonConfig(path);
  assert(config.compatibility_date >= "2026-09-05", `${path} compatibility date is stale.`);
  assert(config.observability?.enabled === true, `${path} must enable observability.`);
  assert(hasBinding(config.r2_buckets, "HOSTED_PAGE_SNAPSHOTS"), `${path} is missing snapshot storage.`);
}

assert(existsSync(resolve(root, "supabase/schema.sql")), "The canonical database schema is missing.");
assert(
  readdirSync(resolve(root, "supabase")).filter((name) => /^\d{4}-\d{2}-\d{2}-.+\.sql$/u.test(name)).length >= 10,
  "Database migration history is incomplete."
);

const runbookPath = resolve(root, "docs/recovery-runbook.md");
assert(existsSync(runbookPath), "The recovery runbook is missing.");
const runbook = readFileSync(runbookPath, "utf8");
for (const section of ["Neon recovery", "Cloudflare rollback", "R2 recovery", "Owner-observed drill"]) {
  assert(runbook.includes(section), `The recovery runbook is missing: ${section}.`);
}

console.log(`Recovery readiness configuration passed ${checks} checks.`);

function readJsonConfig(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function hasRoute(config, pattern) {
  return Array.isArray(config.routes) && config.routes.some((route) => route?.pattern === pattern);
}

function hasBinding(bindings, name) {
  return Array.isArray(bindings) && bindings.some((binding) => binding?.binding === name);
}

function hasRateLimit(config, name, limit) {
  return Array.isArray(config.ratelimits) && config.ratelimits.some((binding) =>
    binding?.name === name && binding?.simple?.limit === limit && binding?.simple?.period === 60
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks += 1;
}
