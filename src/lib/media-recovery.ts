const stateKey = "state/product-media.json";
const batchSize = 50;
const leaseMs = 10 * 60 * 1000;

export type MediaBackupState = {
  runId: string;
  startedAt: string;
  completedAt?: string;
  lastCompletedAt?: string;
  cursor?: string;
  objects: number;
  bytes: number;
  leaseUntil: number;
  error?: string;
};

export async function getMediaBackupState(backup: R2Bucket): Promise<MediaBackupState | null> {
  const object = await backup.get(stateKey);
  return object ? object.json<MediaBackupState>() : null;
}

export async function runMediaBackupBatch(source: R2Bucket, backup: R2Bucket, now = Date.now()) {
  const existing = await backup.get(stateKey);
  const previous = existing ? await existing.json<MediaBackupState>() : null;
  if (previous && (previous.leaseUntil > now || previous.completedAt?.slice(0, 10) === new Date(now).toISOString().slice(0, 10))) {
    return previous;
  }
  const state: MediaBackupState = previous && !previous.completedAt ? { ...previous } : {
    runId: `${new Date(now).toISOString().slice(0, 10)}-${crypto.randomUUID()}`,
    startedAt: new Date(now).toISOString(),
    lastCompletedAt: previous?.lastCompletedAt,
    objects: 0,
    bytes: 0,
    leaseUntil: 0
  };
  state.leaseUntil = now + leaseMs;
  delete state.error;
  // Conditional writes prevent overlapping cron/manual runs from advancing the same cursor.
  const lease = await backup.put(stateKey, JSON.stringify(state), {
    onlyIf: existing ? { etagMatches: existing.etag } : { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "application/json" }
  });
  if (!lease) throw new Error("A media backup is already running.");
  const retryState = { ...state, leaseUntil: 0 };
  try {
    const page = await source.list({ cursor: state.cursor, limit: batchSize });
    let objects = 0;
    let bytes = 0;
    for (const object of page.objects) {
      if (object.key.startsWith("_recovery-")) continue;
      const result = await backupMediaObject(source, backup, object.key, `runs/${state.runId}/objects/${object.key}`);
      objects += 1;
      bytes += result.size;
    }
    state.objects += objects;
    state.bytes += bytes;
    state.cursor = page.truncated ? page.cursor : undefined;
    if (!page.truncated) {
      state.completedAt = new Date(now).toISOString();
      state.lastCompletedAt = state.completedAt;
    }
    state.leaseUntil = 0;
    const saved = await backup.put(stateKey, JSON.stringify(state), { onlyIf: { etagMatches: lease.etag } });
    if (!saved) throw new Error("The media backup lease changed before completion.");
    return state;
  } catch (error) {
    // Retain the original cursor and counters so the entire failed page is retried.
    await backup.put(stateKey, JSON.stringify({ ...retryState, error: "Media backup batch failed; retry pending." }),
    { onlyIf: { etagMatches: lease.etag } });
    throw error;
  }
}

export async function backupMediaObject(source: R2Bucket, backup: R2Bucket, key: string, backupKey: string) {
  const existing = await backup.head(backupKey);
  if (existing) return existing;
  const object = await source.get(key);
  if (!object) throw new Error("A media object disappeared during backup; retry the batch.");
  const result = await backup.put(backupKey, object.body, {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: object.httpMetadata,
    customMetadata: { ...object.customMetadata, recoverySourceKey: key, recoverySourceEtag: object.etag },
    ...(/^[a-f0-9]{32}$/.test(object.etag) ? { md5: object.etag } : {})
  });
  const stored = result ?? await backup.head(backupKey);
  if (!stored || stored.size !== object.size) throw new Error("Media backup integrity check failed.");
  return stored;
}

export async function restoreMediaToStaging(source: R2Bucket, backup: R2Bucket, backupKey: string) {
  if (!/^(runs|drills)\//.test(backupKey) || backupKey.includes("..") || backupKey.includes("\\")) {
    throw new Error("Invalid media backup key.");
  }
  const object = await backup.get(backupKey);
  if (!object?.customMetadata?.recoverySourceKey) throw new Error("Media backup was not found.");
  const restoredKey = `_recovery-restores/${crypto.randomUUID()}`;
  const { recoverySourceKey, recoverySourceEtag: _etag, ...metadata } = object.customMetadata;
  const restored = await source.put(restoredKey, object.body, {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: object.httpMetadata,
    customMetadata: metadata,
    ...(/^[a-f0-9]{32}$/.test(object.etag) ? { md5: object.etag } : {})
  });
  if (!restored || restored.size !== object.size || restored.etag !== object.etag) {
    throw new Error("Restored media integrity check failed.");
  }
  return { restoredKey, originalKey: recoverySourceKey, bytes: restored.size, etag: restored.etag };
}

export async function runMediaRecoveryDrill(source: R2Bucket, backup: R2Bucket) {
  const id = crypto.randomUUID();
  const key = `_recovery-drills/${id}.png`;
  const backupKey = `drills/${id}/original.png`;
  const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0cAAAAASUVORK5CYII="), (character) => character.charCodeAt(0));
  let restoredKey: string | undefined;
  try {
    await source.put(key, bytes, { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "image/png" }, customMetadata: { purpose: "recovery-drill" } });
    await backupMediaObject(source, backup, key, backupKey);
    await source.delete(key);
    if (await source.head(key)) throw new Error("Disposable drill object was not removed.");
    const restored = await restoreMediaToStaging(source, backup, backupKey);
    restoredKey = restored.restoredKey;
    const object = await source.get(restoredKey);
    const expectedHash = await sha256(bytes);
    const actualHash = object ? await sha256(new Uint8Array(await object.arrayBuffer())) : null;
    if (actualHash !== expectedHash || object?.httpMetadata?.contentType !== "image/png" || object?.customMetadata?.purpose !== "recovery-drill") {
      throw new Error("Media restore drill failed byte or metadata verification.");
    }
    return { ok: true, backupKey, bytes: bytes.length, sha256: actualHash, originalRemoved: true, metadataVerified: true };
  } finally {
    await source.delete(key);
    if (restoredKey) await source.delete(restoredKey);
  }
}

async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}
