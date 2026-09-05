import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backupMediaObject, getMediaBackupState, restoreMediaToStaging, runMediaBackupBatch, runMediaRecoveryDrill } from "@/lib/media-recovery";

describe("R2 backup and recovery", () => {
  let runtime: Miniflare;
  let source: R2Bucket;
  let backup: R2Bucket;
  beforeEach(async () => {
    runtime = new Miniflare(convertV4MiniflareOptions({ name: "recovery-test", modules: true, script: "export default { fetch() { return new Response('test'); } }", r2Buckets: ["SOURCE", "BACKUP"] }));
    source = await testBucket(runtime, "SOURCE");
    backup = await testBucket(runtime, "BACKUP");
  });
  afterEach(async () => { vi.restoreAllMocks(); await runtime?.dispose(); });

  it("recovers a deleted disposable image with matching SHA-256 and metadata", async () => {
    const result = await runMediaRecoveryDrill(source, backup);
    expect(result).toMatchObject({ ok: true, originalRemoved: true, metadataVerified: true });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect((await source.list()).objects).toHaveLength(0);
    expect(await backup.head(result.backupKey)).not.toBeNull();
  });

  it("keeps daily copies after source replacement and only restores to new keys", async () => {
    await source.put("products/test.png", "original", { httpMetadata: { contentType: "image/png" }, customMetadata: { role: "main" } });
    const day1 = await runMediaBackupBatch(source, backup, Date.parse("2026-09-05T00:00:00Z"));
    await source.put("products/test.png", "replacement");
    const day2 = await runMediaBackupBatch(source, backup, Date.parse("2026-09-06T00:00:00Z"));
    expect(day1.completedAt).toBeTruthy();
    expect(day1.runId).not.toBe(day2.runId);
    const restored = await restoreMediaToStaging(source, backup, `runs/${day1.runId}/objects/products/test.png`);
    expect(restored.restoredKey).toMatch(/^_recovery-restores\//);
    expect(await (await source.get(restored.restoredKey))?.text()).toBe("original");
    expect(await (await source.get("products/test.png"))?.text()).toBe("replacement");
    expect((await source.get(restored.restoredKey))?.customMetadata).toEqual({ role: "main" });
  });

  it("resumes pagination without marking a partial backup complete", async () => {
    for (let index = 0; index < 51; index++) await source.put(`products/${index}.png`, "image");
    const now = Date.now();
    const first = await runMediaBackupBatch(source, backup, now);
    expect(first.objects).toBe(50);
    expect(first.completedAt).toBeUndefined();
    expect(first.cursor).toBeTruthy();
    const second = await runMediaBackupBatch(source, backup, now);
    expect(second.objects).toBe(51);
    expect(second.completedAt).toBeTruthy();
    expect((await runMediaBackupBatch(source, backup, now)).runId).toBe(second.runId);
  }, 30000);

  it("retains failed work and retries without replacing completed backup objects", async () => {
    await source.put("products/a.png", "a");
    await source.put("products/b.png", "b");
    const realGet = source.get.bind(source);
    const failure = vi.spyOn(source, "get").mockImplementation(async (key: string) => {
      if (key === "products/b.png") throw new Error("storage unavailable");
      return realGet(key);
    });
    await expect(runMediaBackupBatch(source, backup)).rejects.toThrow(/unavailable/);
    const failed = await getMediaBackupState(backup);
    expect(failed).toMatchObject({ objects: 0, leaseUntil: 0 });
    expect(failed?.error).toBeTruthy();
    expect(failed?.completedAt).toBeUndefined();
    failure.mockRestore();
    await source.put("products/a.png", "later change");
    const retried = await runMediaBackupBatch(source, backup);
    expect(retried.objects).toBe(2);
    expect(await (await backup.get(`runs/${retried.runId}/objects/products/a.png`))?.text()).toBe("a");
  });

  it("does not take over an active backup lease", async () => {
    await backup.put("state/product-media.json", JSON.stringify({ runId: "busy", objects: 0, bytes: 0, leaseUntil: Date.now() + 60000 }));
    const list = vi.spyOn(source, "list");
    expect((await runMediaBackupBatch(source, backup)).runId).toBe("busy");
    expect(list).not.toHaveBeenCalled();
  });

  it("does not claim a new successful backup when completion persistence fails", async () => {
    const realPut = backup.put.bind(backup);
    let stateWrites = 0;
    vi.spyOn(backup, "put").mockImplementation(async (key, value, options) => {
      if (key === "state/product-media.json" && ++stateWrites === 2) throw new Error("checkpoint unavailable");
      return realPut(key, value, options);
    });
    await expect(runMediaBackupBatch(source, backup)).rejects.toThrow(/checkpoint unavailable/);
    const state = await getMediaBackupState(backup);
    expect(state?.completedAt).toBeUndefined();
    expect(state?.lastCompletedAt).toBeUndefined();
    expect(state?.error).toBeTruthy();
    expect((await runMediaBackupBatch(source, backup)).completedAt).toBeTruthy();
  });

  it("rejects absent source and invalid restore paths", async () => {
    await expect(backupMediaObject(source, backup, "missing", "runs/test/missing")).rejects.toThrow(/disappeared/);
    for (const key of ["state/product-media.json", "runs/../secret", "drills/missing"]) {
      await expect(restoreMediaToStaging(source, backup, key)).rejects.toThrow();
    }
  });
});

async function testBucket(runtime: Miniflare, name: string) {
  const bucket = await runtime.getR2Bucket(name);
  return {
    head: bucket.head.bind(bucket), get: bucket.get.bind(bucket), list: bucket.list.bind(bucket), delete: bucket.delete.bind(bucket),
    // The Node-to-workerd test bridge loses stream length; real R2 bodies keep it in Workers.
    put: async (key: string, value: Parameters<R2Bucket["put"]>[1], options?: Parameters<R2Bucket["put"]>[2]) => {
      const body = await new Response(value as BodyInit).arrayBuffer();
      return bucket.put(key, body, options as Parameters<typeof bucket.put>[2]);
    }
  // Miniflare's proxy uses Undici header/stream types at this test-only boundary.
  } as unknown as R2Bucket;
}
