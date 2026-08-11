import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultBaseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

export function createSmokeChecks(baseUrl = defaultBaseUrl) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return [
    {
      label: "Home page",
      path: "/",
      url: `${normalizedBaseUrl}/`,
      acceptableStatuses: [200]
    },
    {
      label: "Product page",
      path: "/product/google-review-stand",
      url: `${normalizedBaseUrl}/product/google-review-stand`,
      acceptableStatuses: [200]
    },
    {
      label: "Admin login route",
      path: "/admin/login",
      url: `${normalizedBaseUrl}/admin/login`,
      acceptableStatuses: [200]
    },
    {
      label: "Activation page",
      path: "/activate",
      url: `${normalizedBaseUrl}/activate`,
      acceptableStatuses: [200]
    },
    {
      label: "Demo redirect route",
      path: "/r/TR-DEMO-GOOGLE",
      url: `${normalizedBaseUrl}/r/TR-DEMO-GOOGLE`,
      acceptableStatuses: [200, 302, 303, 307, 308]
    }
  ];
}

export function isAcceptableStatus(status, acceptableStatuses) {
  return acceptableStatuses.includes(status);
}

export async function runSmokeChecks(baseUrl = defaultBaseUrl, fetchImplementation = fetch) {
  const checks = createSmokeChecks(baseUrl);
  const results = [];

  for (const check of checks) {
    try {
      const response = await fetchImplementation(check.url, { redirect: "manual" });
      results.push({
        ...check,
        status: response.status,
        ok: isAcceptableStatus(response.status, check.acceptableStatuses)
      });
    } catch (error) {
      results.push({
        ...check,
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : "Request failed"
      });
    }
  }

  return results;
}

function printResults(results) {
  for (const result of results) {
    const status = result.status || "ERR";
    const marker = result.ok ? "PASS" : "FAIL";
    const suffix = result.error ? ` - ${result.error}` : "";
    console.log(`${marker} ${status} ${result.path} ${result.label}${suffix}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseUrl = process.argv[2] || defaultBaseUrl;
  const results = await runSmokeChecks(baseUrl);
  printResults(results);

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}
