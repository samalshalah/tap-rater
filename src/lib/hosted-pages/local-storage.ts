import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { HostedPageTextStorage } from "./repository";

export function createLocalHostedPageStorage(root: string): HostedPageTextStorage {
  const absoluteRoot = resolve(root);

  return {
    async getText(key) {
      assertHostedPageStorageKey(key);
      try {
        return await readFile(join(absoluteRoot, ...key.split("/")), "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async putText(key, value) {
      assertHostedPageStorageKey(key);
      const filePath = join(absoluteRoot, ...key.split("/"));
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, value, "utf8");
    },
    async putTextIfAbsent(key, value) {
      assertHostedPageStorageKey(key);
      const filePath = join(absoluteRoot, ...key.split("/"));
      await mkdir(dirname(filePath), { recursive: true });

      try {
        await writeFile(filePath, value, { encoding: "utf8", flag: "wx" });
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw error;
      }
    }
  };
}

function assertHostedPageStorageKey(key: string) {
  if (!key.startsWith("hosted-pages/") || key.includes("..") || key.includes("\\") || key.startsWith("/")) {
    throw new Error("Invalid hosted page storage key.");
  }
}
