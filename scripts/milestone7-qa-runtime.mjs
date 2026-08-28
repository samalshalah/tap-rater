import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const qaEnvFile = ".env.milestone7-qa";
const command = process.argv[2] ?? "--check";

if (!["--check", "--dev"].includes(command)) {
  fail("Usage: npm run milestone7:qa:check-env or npm run milestone7:qa:dev");
}

if (!existsSync(qaEnvFile)) {
  fail(`${qaEnvFile} is required and is intentionally gitignored.`);
}

loadEnvFile(qaEnvFile);
assertQaEnvironment();

console.log("Milestone 7 QA runtime environment verified.");
console.log("DATABASE ENVIRONMENT: milestone7-qa");
console.log("STRIPE ENVIRONMENT: TEST");
console.log("R2 ENVIRONMENT: QA");

if (command === "--dev") {
  const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

function loadEnvFile(path) {
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = stripQuotes(line.slice(separator + 1).trim());
    if (key) process.env[key] = value;
  }
}

function assertQaEnvironment() {
  const requiredBranchId = "br-restless-shape-at38e1nu";
  const requiredProjectId = "winter-grass-30947546";

  requireValue("DATABASE_URL");
  requireExact("TAP_RATER_RUNTIME_ENVIRONMENT", "milestone7-qa");
  requireExact("NEON_PROJECT_ID", requiredProjectId);
  requireExact("NEON_BRANCH_ID", requiredBranchId);
  requireExact("NEON_DATABASE_NAME", "neondb");
  requireExact("STRIPE_MODE", "test");
  requirePrefix("STRIPE_SECRET_KEY", "sk_test_");
  requirePrefix("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_");
  requirePrefix("STRIPE_WEBHOOK_SECRET", "whsec_");
  requireExact("TAP_RATER_REMOTE_HOSTED_PAGES_BUCKET", "tap-rater-hosted-page-snapshots-qa");

  const siteUrl = requireValue("NEXT_PUBLIC_SITE_URL");
  if (/taprater\.com/i.test(siteUrl) && !/workers\.dev/i.test(siteUrl)) {
    fail("NEXT_PUBLIC_SITE_URL must be a QA workers.dev or local URL, not a production custom domain.");
  }

  const accountUrl = process.env.NEXT_PUBLIC_ACCOUNT_APP_URL;
  if (accountUrl && /app\.taprater\.com/i.test(accountUrl)) {
    fail("NEXT_PUBLIC_ACCOUNT_APP_URL must not point to app.taprater.com for Milestone 7 QA.");
  }
}

function requireValue(key) {
  const value = process.env[key]?.trim();
  if (!value) fail(`${key} is required.`);
  return value;
}

function requireExact(key, expected) {
  const value = requireValue(key);
  if (value !== expected) fail(`${key} must be ${expected}.`);
}

function requirePrefix(key, prefix) {
  const value = requireValue(key);
  if (!value.startsWith(prefix)) fail(`${key} must start with ${prefix}.`);
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function fail(message) {
  console.error(`Milestone 7 QA runtime blocked: ${message}`);
  process.exit(1);
}
