import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  assignPermanentHostedPageCode,
  publishHostedPageSnapshot,
  readCurrentHostedPageSnapshot,
  rollbackHostedPageSnapshot,
  type HostedPagePutOptions,
  type HostedPageTextStorage
} from "../src/lib/hosted-pages/repository";
import type { HostedPageLifecycleStatus, HostedPageSnapshot } from "../src/lib/hosted-pages/snapshots";

const execFileAsync = promisify(execFile);
const bucketName = process.env.HOSTED_PAGE_QA_BUCKET ?? "tap-rater-hosted-page-snapshots-qa";
const code = process.env.HOSTED_PAGE_QA_CODE ?? "ABCDEFGHJKM2";
const physicalProductRef = process.env.HOSTED_PAGE_QA_PRODUCT_REF ?? "qa-order-2026-08-23:item-1";

const command = process.argv[2];

if (!command) {
  throw new Error("Usage: npx tsx scripts/hosted-pages-r2-qa.ts <publish-v1|publish-v2|publish-expired|failed-publish|rollback-v1|rollback-v2|read-current>");
}

async function main() {
  const storage = new WranglerR2Storage(bucketName);

  if (command === "publish-v1") {
    await assignPermanentHostedPageCode(storage, { physicalProductRef, code, assignedBy: "milestone5-isolated-worker-qa" });
    await publishHostedPageSnapshot(storage, snapshot("v1", "Tap Rater Hosted QA", "ACTIVE"));
    await reportCurrent(storage);
  } else if (command === "publish-v2") {
    await assignPermanentHostedPageCode(storage, { physicalProductRef, code, assignedBy: "milestone5-isolated-worker-qa" });
    await publishHostedPageSnapshot(storage, snapshot("v2", "Tap Rater Hosted QA V2", "ACTIVE"));
    await reportCurrent(storage);
  } else if (command === "publish-expired") {
    await publishHostedPageSnapshot(storage, snapshot("expired-v1", "Tap Rater Hosted QA Expired", "EXPIRED"));
    await reportCurrent(storage);
  } else if (command === "failed-publish") {
    const failingStorage = new FailingCurrentPointerStorage(storage);
    await publishHostedPageSnapshot(failingStorage, snapshot("failed-v3", "Tap Rater Hosted QA Failed Publish", "ACTIVE"));
  } else if (command === "rollback-v1") {
    await rollbackHostedPageSnapshot(storage, code, "v1");
    await reportCurrent(storage);
  } else if (command === "rollback-v2") {
    await rollbackHostedPageSnapshot(storage, code, "v2");
    await reportCurrent(storage);
  } else if (command === "read-current") {
    await reportCurrent(storage);
  } else {
    throw new Error(`Unknown QA command: ${command}`);
  }
}

function snapshot(version: string, businessName: string, lifecycleStatus: HostedPageLifecycleStatus): HostedPageSnapshot {
  return {
    schemaVersion: 1,
    code,
    version,
    publishedAt: new Date().toISOString(),
    lifecycleStatus,
    businessName,
    headline: version === "v2" ? "Updated QA hosted page" : "QA hosted page",
    description: `Milestone 5 isolated Worker R2 QA snapshot ${version}.`,
    buttons: [
      {
        id: "google-review",
        label: "Google Review",
        type: "review",
        url: "https://example.com/google-review"
      },
      {
        id: "website",
        label: "Website",
        type: "website",
        url: "https://example.com"
      }
    ],
    appearance: {
      accentColor: "#0f766e"
    }
  };
}

async function reportCurrent(storage: HostedPageTextStorage) {
  const current = await readCurrentHostedPageSnapshot(storage, code);
  console.log(JSON.stringify({ bucketName, current }, null, 2));
}

class WranglerR2Storage implements HostedPageTextStorage {
  constructor(private readonly bucket: string) {}

  async getText(key: string) {
    const directory = qaTempDirectory();
    await mkdir(directory, { recursive: true });
    const outputPath = join(directory, "object.json");

    try {
      await runWrangler(["r2", "object", "get", `${this.bucket}/${key}`, "--remote", "--file", toCliPath(outputPath)]);
      return await readFile(outputPath, "utf8");
    } catch (error) {
      if (String(error).includes("Not Found") || String(error).includes("404") || String(error).includes("specified key does not exist")) {
        return null;
      }
      throw error;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async putText(key: string, value: string, _options?: HostedPagePutOptions) {
    await this.putObject(key, value);
  }

  async putTextIfAbsent(key: string, value: string, _options?: HostedPagePutOptions) {
    const existing = await this.getText(key);
    if (existing !== null) return false;
    await this.putObject(key, value);
    return true;
  }

  private async putObject(key: string, value: string) {
    const directory = qaTempDirectory();
    await mkdir(directory, { recursive: true });
    const inputPath = join(directory, "object.json");

    try {
      await writeFile(inputPath, value, "utf8");
      await runWrangler(["r2", "object", "put", `${this.bucket}/${key}`, "--remote", "--file", toCliPath(inputPath), "--content-type", "application/json"]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

class FailingCurrentPointerStorage implements HostedPageTextStorage {
  constructor(private readonly storage: HostedPageTextStorage) {}

  getText(key: string) {
    return this.storage.getText(key);
  }

  putText(key: string, value: string, options?: HostedPagePutOptions) {
    if (key.endsWith("/current.json")) {
      throw new Error("Simulated publish failure before current-version promotion.");
    }
    return this.storage.putText(key, value, options);
  }

  putTextIfAbsent(key: string, value: string, options?: HostedPagePutOptions) {
    return this.storage.putTextIfAbsent(key, value, options);
  }
}

async function runWrangler(args: string[]) {
  const startedAt = performance.now();
  try {
    const commandName = process.platform === "win32" ? "cmd.exe" : "npx";
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", ["npx", "wrangler", ...args].map(quoteShellArg).join(" ")]
        : ["wrangler", ...args];
    const result = await execFileAsync(commandName, commandArgs, {
      cwd: process.cwd(),
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });
    if (result.stdout.trim()) process.stderr.write(result.stdout);
    if (result.stderr.trim()) process.stderr.write(result.stderr);
    return result;
  } catch (error) {
    const failed = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`wrangler ${args.join(" ")} failed after ${Math.round(performance.now() - startedAt)}ms\n${failed.stdout ?? ""}\n${failed.stderr ?? ""}`);
  }
}

function quoteShellArg(value: string) {
  if (/^[A-Za-z0-9_./:=~-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function qaTempDirectory() {
  return join("tmp", `tap-rater-hosted-r2-${Date.now()}-${crypto.randomUUID()}`);
}

function toCliPath(value: string) {
  return value.replaceAll("\\", "/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
