import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { createSessionToken, parseSessionToken } from "@/lib/session-token";

export const customerCookieName = "taprater_customer";

const defaultSessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const loginTokenTtlMs = 20 * 60 * 1000;

export type CustomerSession = {
  email: string;
  issuedAt: number;
};

export type CustomerAuthDbClient = {
  from: (table: string) => any;
};

export function createCustomerSessionValue(email: string, issuedAt = Date.now()) {
  return createSessionToken("customer-session", email, issuedAt, requireCustomerSecret());
}

export function parseCustomerSession(value: string | undefined, now = Date.now()): CustomerSession | null {
  const payload = parseSessionToken(value, "customer-session", getCustomerSecret(), defaultSessionTtlMs, now);
  return payload;
}

export function createCustomerLoginToken(email: string, issuedAt = Date.now()) {
  return createSessionToken("customer-login", email, issuedAt, requireCustomerSecret());
}

export function parseCustomerLoginToken(value: string | undefined, now = Date.now()): CustomerSession | null {
  const payload = parseSessionToken(value, "customer-login", getCustomerSecret(), loginTokenTtlMs, now);
  return payload;
}

export async function requireCustomer() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session || !(await isActiveCustomerSession(session.email, session.issuedAt))) {
    redirect("/account/login");
  }

  return session;
}

export async function requireCustomerApi() {
  const cookieStore = await cookies();
  const session = parseCustomerSession(cookieStore.get(customerCookieName)?.value);

  if (!session || !(await isActiveCustomerSession(session.email, session.issuedAt))) {
    return { response: NextResponse.json({ error: "Customer authentication required." }, { status: 401 }), session: null };
  }

  return { response: null, session };
}

export async function isActiveCustomerSession(email: string, issuedAt?: number) {
  if (!hasSupabaseAdminConfig()) return false;

  try {
    return await isActiveCustomerSessionWithClient(getSupabaseAdmin() as CustomerAuthDbClient, email, issuedAt);
  } catch {
    return false;
  }
}

export async function isActiveCustomerSessionWithClient(client: CustomerAuthDbClient, email: string, issuedAt?: number) {
  const { data, error } = await client
    .from("customers")
    .select("account_status,sessions_invalid_before")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error || data?.account_status !== "active") return false;
  if (!data.sessions_invalid_before) return true;
  const invalidBefore = Date.parse(data.sessions_invalid_before);
  return Number.isFinite(invalidBefore) && typeof issuedAt === "number" && issuedAt > invalidBefore;
}

function getCustomerSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  return secret && secret !== process.env.ADMIN_SESSION_SECRET ? secret : undefined;
}

function requireCustomerSecret() {
  const secret = getCustomerSecret();
  if (!secret) throw new Error("CUSTOMER_SESSION_SECRET must be configured separately from ADMIN_SESSION_SECRET.");
  return secret;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
