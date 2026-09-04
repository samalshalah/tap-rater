import { checkDatabase } from "./db.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "../../..", ".env.local"));
loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "../../..", ".env"));

const result = await checkDatabase();

if (result.ok) {
  console.log("PASS backend database check");
  process.exit(0);
}

console.error(`FAIL backend database check: ${result.error}`);
process.exit(1);

function loadEnvFile(filePath: string) {
  try {
    const env = readFileSync(filePath, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Deployment and CI environments can provide variables without local env files.
  }
}
