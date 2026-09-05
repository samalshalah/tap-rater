import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export type CustomerAccountDbClient = {
  from: (table: string) => any;
};

export type CustomerAccountStatus = "pending_activation" | "active" | "disabled";

const passwordHashPrefix = "scrypt";
const passwordKeyLength = 64;
const activationTokenBytes = 32;

export function createCustomerActivationUrl(token: string) {
  const siteUrl = process.env.NEXT_PUBLIC_ACCOUNT_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com";
  return `${siteUrl.replace(/\/$/, "")}/account/activate?token=${encodeURIComponent(token)}`;
}

export function createCustomerActivationToken() {
  const token = randomBytes(activationTokenBytes).toString("base64url");
  return {
    token,
    tokenHash: hashActivationToken(token)
  };
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, passwordKeyLength).toString("hex");
  return `${passwordHashPrefix}$${salt}$${hash}`;
}

export function verifyCustomerPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  const [prefix, salt, hash] = storedHash.split("$");
  if (prefix !== passwordHashPrefix || !salt || !hash) return false;

  try {
    const actual = Buffer.from(scryptSync(password, salt, passwordKeyLength).toString("hex"));
    const expected = Buffer.from(hash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function activateCustomerAccount(token: string, password: string, now = new Date()) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false as const, error: "Customer account activation is not configured yet.", status: 503 };
  }

  return activateCustomerAccountWithClient(getSupabaseAdmin() as CustomerAccountDbClient, token, password, now);
}

export async function activateCustomerAccountWithClient(client: CustomerAccountDbClient, token: string, password: string, now = new Date()) {
  const tokenHash = hashActivationToken(token);
  const { data: customer, error } = await client
    .from("customers")
    .select("id,email,account_status,activation_expires_at")
    .eq("activation_token_hash", tokenHash)
    .maybeSingle();

  if (error || !customer?.id) {
    return { ok: false as const, error: "Activation link is invalid or expired.", status: 401 };
  }

  if (customer.account_status !== "pending_activation") {
    return { ok: false as const, error: "Activation link is invalid or expired.", status: 401 };
  }

  const expiresAt = readDate(customer.activation_expires_at);
  if (!expiresAt || expiresAt.getTime() < now.getTime()) {
    return { ok: false as const, error: "Activation link is invalid or expired.", status: 401 };
  }

  const normalizedEmail = normalizeEmail(String(customer.email ?? ""));
  if (!normalizedEmail) {
    return { ok: false as const, error: "Customer email is missing.", status: 500 };
  }

  const { error: updateError } = await client
    .from("customers")
    .update({
      password_hash: hashCustomerPassword(password),
      account_status: "active",
      email_verified_at: now.toISOString(),
      activated_at: now.toISOString(),
      activation_token_hash: null,
      activation_expires_at: null,
      updated_at: now.toISOString()
    })
    .eq("id", String(customer.id));

  if (updateError) {
    return { ok: false as const, error: updateError.message ?? "Customer account could not be activated.", status: 500 };
  }

  return { ok: true as const, email: normalizedEmail };
}

export async function getCustomerPasswordLoginRecord(email: string) {
  if (!hasSupabaseAdminConfig()) {
    return { configured: false as const, customer: null };
  }

  const { data } = await getSupabaseAdmin()
    .from("customers")
    .select("id,email,password_hash,account_status")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  return { configured: true as const, customer: normalizePasswordLoginRecord(data) };
}

export function normalizePasswordLoginRecord(row: unknown) {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = readString(value.id);
  const email = normalizeEmail(readString(value.email) ?? "");
  if (!id || !email) return null;
  return {
    id,
    email,
    passwordHash: readString(value.password_hash),
    accountStatus: readAccountStatus(value.account_status)
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAccountStatus(value: unknown): CustomerAccountStatus {
  return value === "active" || value === "disabled" ? value : "pending_activation";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
