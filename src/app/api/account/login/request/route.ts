import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { adminCookieName, createAdminSessionValue } from "@/lib/admin-auth";
import { createCustomerSessionValue, customerCookieName } from "@/lib/customer-auth";
import { accountLoginRequestSchema } from "@/lib/validators";

const customerSessionMaxAgeSeconds = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const parsed = accountLoginRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const expectedPassword = getExpectedPassword(email);

  if (!expectedPassword) {
    return NextResponse.json({ error: "Customer password login is not configured yet. Please contact Tap Rater support." }, { status: 503 });
  }

  if (!passwordMatches(password, expectedPassword)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (isConfiguredAdminEmail(email)) {
    return createAdminLoginResponse(email, request);
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Customer login is not configured yet." }, { status: 503 });
  }

  const { data: customer } = await getSupabaseAdmin().from("customers").select("id,email").eq("email", email).maybeSingle();

  if (!customer?.id) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  return createLoginResponse(customer.email ?? email, request);
}

function createLoginResponse(email: string, request: Request) {
  const response = NextResponse.json({ ok: true, redirectTo: "/account" });
  response.cookies.set(customerCookieName, createCustomerSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: customerSessionMaxAgeSeconds
  });
  return response;
}

function createAdminLoginResponse(email: string, request: Request) {
  const response = NextResponse.json({ ok: true, redirectTo: "/admin" });
  response.cookies.set(adminCookieName, createAdminSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/"
  });
  return response;
}

function getExpectedPassword(email: string) {
  if (isConfiguredAdminEmail(email) && process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  return process.env.CUSTOMER_ACCOUNT_PASSWORD || process.env.CUSTOMER_LOGIN_PASSWORD || "";
}

function passwordMatches(actual: string, expected: string) {
  return actual.length === expected.length && actual === expected;
}

function isConfiguredAdminEmail(email: string) {
  return Boolean(process.env.ADMIN_EMAIL) && normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL ?? "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
