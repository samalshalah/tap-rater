import { randomUUID } from "node:crypto";
import { publishHostedPageSnapshot, readCurrentHostedPageSnapshot, type HostedPageTextStorage } from "./repository";
import { normalizeHostedPageForwardUrl, validateHostedPageSnapshot } from "./snapshots";

export type ForwardLinkResult = { ok: true; forwardUrl: string | null } | { ok: false; status: number; error: string };

export async function readHostedPageForwardUrl(storage: HostedPageTextStorage, code: string) {
  const current = await readCurrentHostedPageSnapshot(storage, code).catch(() => null);
  return current?.forwardUrl ?? null;
}

/**
 * Sets (or clears, with an empty value) where an ended Multi-Link page sends visitors.
 * Republishes the same page with only the forwarding link changed.
 */
export async function saveHostedPageForwardUrl(storage: HostedPageTextStorage, code: string, value: unknown): Promise<ForwardLinkResult> {
  const raw = typeof value === "string" ? value.trim() : "";
  const forwardUrl = raw ? normalizeHostedPageForwardUrl(raw) : null;
  if (raw && !forwardUrl) return { ok: false, status: 400, error: "Enter a full web address, like https://yourbusiness.com." };
  const current = await readCurrentHostedPageSnapshot(storage, code);
  if (!current) return { ok: false, status: 409, error: "Publish the page first, then add a forwarding link." };
  await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
    ...current,
    forwardUrl: forwardUrl ?? undefined,
    version: `forward-${Date.now()}-${randomUUID().slice(0, 8)}`,
    publishedAt: new Date().toISOString(),
  }));
  return { ok: true, forwardUrl };
}
