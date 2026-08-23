import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import type { HostedPagePutOptions, HostedPageTextStorage } from "./repository";

const execFileAsync = promisify(execFile);

export function createWranglerR2HostedPageStorage(bucket: string): HostedPageTextStorage {
  const trimmedBucket = bucket.trim();
  if (!trimmedBucket) throw new Error("Hosted page QA R2 bucket is required.");

  return {
    async getText(key) {
      const directory = qaTempDirectory();
      await mkdir(directory, { recursive: true });
      const outputPath = join(directory, "object.json");

      try {
        await runWrangler(["r2", "object", "get", `${trimmedBucket}/${key}`, "--remote", "--file", toCliPath(outputPath)]);
        return await readFile(outputPath, "utf8");
      } catch (error) {
        if (isMissingObjectError(error)) return null;
        throw error;
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    async putText(key, value, options) {
      await putObject(trimmedBucket, key, value, options);
    },
    async putTextIfAbsent(key, value, options) {
      const existing = await this.getText(key);
      if (existing !== null) return false;
      await putObject(trimmedBucket, key, value, options);
      return true;
    }
  };
}

async function putObject(bucket: string, key: string, value: string, options?: HostedPagePutOptions) {
  const directory = qaTempDirectory();
  await mkdir(directory, { recursive: true });
  const inputPath = join(directory, "object.json");

  try {
    await writeFile(inputPath, value, "utf8");
    const args = ["r2", "object", "put", `${bucket}/${key}`, "--remote", "--file", toCliPath(inputPath)];
    if (options?.contentType) args.push("--content-type", toCliContentType(options.contentType));
    if (options?.cacheControl) args.push("--cache-control", toCliCacheControl(options.cacheControl));
    await runWrangler(args);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function runWrangler(args: string[]) {
  const startedAt = performance.now();
  try {
    const commandName = process.platform === "win32" ? "cmd.exe" : "npx";
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/c", ["npx", "wrangler", ...args].join(" ")]
        : ["wrangler", ...args];

    return await execFileAsync(commandName, commandArgs, {
      cwd: process.cwd(),
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });
  } catch (error) {
    const failed = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`wrangler ${args.join(" ")} failed after ${Math.round(performance.now() - startedAt)}ms\n${failed.message ?? ""}\n${failed.stdout ?? ""}\n${failed.stderr ?? ""}`);
  }
}

function isMissingObjectError(error: unknown) {
  const text = String(error);
  return text.includes("Not Found") || text.includes("404") || text.includes("specified key does not exist");
}

function toCliContentType(value: string) {
  return value.split(";")[0].trim() || "application/json";
}

function toCliCacheControl(value: string) {
  return value.replaceAll(", ", ",");
}

function qaTempDirectory() {
  return join("tmp", `tap-rater-hosted-r2-${Date.now()}-${crypto.randomUUID()}`);
}

function toCliPath(value: string) {
  return value.replaceAll("\\", "/");
}
