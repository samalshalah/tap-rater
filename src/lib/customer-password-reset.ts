import { createHash, randomBytes } from "node:crypto";
import { hashCustomerPassword, normalizeEmail, type CustomerAccountDbClient } from "@/lib/customer-account";
import { getSupabaseAdmin } from "@/lib/db";
import { sendCustomerPasswordResetEmail } from "@/lib/email";

export const customerPasswordResetTtlMs = 20 * 60 * 1000;
export const passwordResetTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const invalidLink = { ok: false as const, status: 401, error: "This reset link is invalid or expired. Request a new link." };

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createCustomerPasswordResetUrl(token: string) {
  const siteUrl = process.env.NEXT_PUBLIC_ACCOUNT_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com";
  const url = new URL("/account/reset-password", siteUrl);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Password recovery requires HTTPS.");
  }
  url.searchParams.set("token", token);
  return url.toString();
}

export async function requestCustomerPasswordReset(email: string) {
  return requestCustomerPasswordResetWithClient(getSupabaseAdmin(), email);
}

export async function requestCustomerPasswordResetWithClient(
  client: CustomerAccountDbClient,
  email: string,
  now = new Date(),
  sendResetEmail = sendCustomerPasswordResetEmail
) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail === normalizeEmail(process.env.ADMIN_EMAIL ?? "")) return;
  const token = randomBytes(32).toString("base64url");
  const resetUrl = createCustomerPasswordResetUrl(token);
  const tokenHash = hashPasswordResetToken(token);
  const { data: customer, error } = await client.from("customers")
    .update({
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: new Date(now.getTime() + customerPasswordResetTtlMs).toISOString()
    })
    .eq("email", normalizedEmail).eq("account_status", "active")
    .select("id,email").maybeSingle();
  if (error) throw new Error("Password recovery storage unavailable.");
  if (!customer) return;

  const result = await sendResetEmail({ to: customer.email, resetUrl });
  if (!result.sent) {
    // Never clear a newer request if delivery of this one failed.
    await client.from("customers").update({ password_reset_token_hash: null, password_reset_expires_at: null })
      .eq("id", customer.id).eq("password_reset_token_hash", tokenHash);
  }
}

export async function resetCustomerPassword(token: string, password: string) {
  return resetCustomerPasswordWithClient(getSupabaseAdmin(), token, password);
}

export async function resetCustomerPasswordWithClient(
  client: CustomerAccountDbClient, token: string, password: string, now = new Date()
) {
  if (!passwordResetTokenPattern.test(token)) return invalidLink;
  if (password.length < 8 || password.length > 200) {
    return { ok: false as const, status: 400, error: "Use a password between 8 and 200 characters." };
  }
  const tokenHash = hashPasswordResetToken(token);
  const { data: customer, error } = await client.from("customers")
    .select("id,email,password_reset_expires_at").eq("password_reset_token_hash", tokenHash)
    .eq("account_status", "active").maybeSingle();
  if (error) throw new Error("Password recovery storage unavailable.");
  const expiresAt = Date.parse(customer?.password_reset_expires_at ?? "");
  if (!customer || !Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return invalidLink;
  if (normalizeEmail(customer.email) === normalizeEmail(process.env.ADMIN_EMAIL ?? "")) return invalidLink;

  // Consume the token and update the password in one conditional write, so concurrent reuse fails.
  const { data: updated, error: updateError } = await client.from("customers")
    .update({
      password_hash: hashCustomerPassword(password),
      password_reset_token_hash: null,
      password_reset_expires_at: null,
      sessions_invalid_before: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq("id", customer.id).eq("account_status", "active").eq("password_reset_token_hash", tokenHash)
    .gte("password_reset_expires_at", now.toISOString()).select("email").maybeSingle();
  if (updateError) throw new Error("Password recovery storage unavailable.");
  return updated ? { ok: true as const, email: normalizeEmail(updated.email) } : invalidLink;
}
