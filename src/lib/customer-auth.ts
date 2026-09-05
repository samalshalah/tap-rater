import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export const customerCookieName = "taprater_customer";

const defaultSessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const loginTokenTtlMs = 20 * 60 * 1000;
const futureClockSkewMs = 5 * 60 * 1000;

export type CustomerSession = {
  email: string;
};

export type CustomerAuthDbClient = {
  from: (table: string) => any;
};

export function createCustomerSessionValue(email: string, issuedAt = Date.now()) {
  return createSignedValue(normalizeEmail(email), issuedAt);
}

export function parseCustomerSession(value: string | undefined, now = Date.now()): CustomerSession | null {
  const payload = parseSignedValue(value, defaultSessionTtlMs, now);
  return payload ? { email: payload.email } : null;
}

export function createCustomerLoginToken(email: string, issuedAt = Date.now()) {
  return createSignedValue(normalizeEmail(email), issuedAt);
}

export function parseCustomerLoginToken(value: string | undefined, now = Date.now()): CustomerSession | null {
  const payload = parseSignedValue(value, loginTokenTtlMs, now);
  return payload ? { email: payload.email } : null;
}

export async function requireCustomer() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session || !(await isActiveCustomerSession(session.email))) {
    redirect("/account/login");
  }

  return session;
}

export async function requireCustomerApi() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session || !(await isActiveCustomerSession(session.email))) {
    return { response: NextResponse.json({ error: "Customer authentication required." }, { status: 401 }), session: null };
  }

  return { response: null, session };
}

export async function isActiveCustomerSession(email: string) {
  if (!hasSupabaseAdminConfig()) return false;

  try {
    return await isActiveCustomerSessionWithClient(getSupabaseAdmin() as CustomerAuthDbClient, email);
  } catch {
    return false;
  }
}

export async function isActiveCustomerSessionWithClient(client: CustomerAuthDbClient, email: string) {
  const { data, error } = await client
    .from("customers")
    .select("account_status")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  return !error && data?.account_status === "active";
}

function createSignedValue(email: string, issuedAt: number) {
  const payload = `${email}:${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

function parseSignedValue(value: string | undefined, maxAgeMs: number, now: number): CustomerSession | null {
  if (!value) {
    return null;
  }

  const decodedValue = decodeCookieValue(value);
  if (decodedValue && decodedValue !== value) {
    return parseSignedValue(decodedValue, maxAgeMs, now);
  }

  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) {
    return null;
  }

  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const payloadParts = payload.split(":");

  if (payloadParts.length < 2) {
    return null;
  }

  const timestampText = payloadParts.at(-1) ?? "";
  const email = payloadParts.slice(0, -1).join(":");
  if (!email || !/^\d+$/.test(timestampText)) {
    return null;
  }

  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp)) {
    return null;
  }

  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  if (timestamp > now + futureClockSkewMs || now - timestamp > maxAgeMs) {
    return null;
  }

  return { email };
}

function sign(value: string) {
  return createHmac("sha256", getCustomerSecret()).update(value).digest("hex");
}

function getCustomerSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("CUSTOMER_SESSION_SECRET or ADMIN_SESSION_SECRET is not configured.");
  }

  return secret;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
