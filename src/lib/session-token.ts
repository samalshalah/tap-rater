import { createHmac, timingSafeEqual } from "node:crypto";

type TokenPurpose = "admin-session" | "customer-session" | "customer-login";
const futureClockSkewMs = 5 * 60 * 1000;

export function createSessionToken(purpose: TokenPurpose, email: string, issuedAt: number, secret: string) {
  const identity = email.trim().toLowerCase();
  if (!/^[^\s:@]+@[^\s:@]+$/.test(identity) || !Number.isSafeInteger(issuedAt) || issuedAt < 0 || !secret) {
    throw new Error("Invalid session configuration or identity.");
  }
  const payload = `v2:${purpose}:${identity}:${issuedAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function parseSessionToken(value: string | undefined, purpose: TokenPurpose, secret: string | undefined, maxAgeMs: number, now = Date.now()) {
  if (!value || value.length > 2048 || !secret) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  const separator = value.lastIndexOf(".");
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const [version, actualPurpose, email, issuedAtText, extra] = payload.split(":");
  if (version !== "v2" || actualPurpose !== purpose || extra !== undefined ||
    !/^[^\s:@]+@[^\s:@]+$/.test(email ?? "") || !/^\d+$/.test(issuedAtText ?? "") ||
    !/^[a-f0-9]{64}$/.test(signature)) return null;
  const issuedAt = Number(issuedAtText);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + futureClockSkewMs || now - issuedAt > maxAgeMs) return null;
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(payload, secret), "hex"))) return null;
  return { email, issuedAt };
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
