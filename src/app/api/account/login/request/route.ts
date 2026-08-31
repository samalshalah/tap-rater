import { NextResponse } from "next/server";
import { adminCookieName, createAdminSessionValue } from "@/lib/admin-auth";
import { getCustomerPasswordLoginRecord, verifyCustomerPassword } from "@/lib/customer-account";
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

  if (isConfiguredAdminEmail(email)) {
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword || !passwordMatches(password, expectedPassword)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    return createAdminLoginResponse(email, request);
  }

  const login = await getCustomerPasswordLoginRecord(email);
  if (!login.configured) {
    return NextResponse.json({ error: "Customer login is not configured yet." }, { status: 503 });
  }

  if (!login.customer || !verifyCustomerPassword(password, login.customer.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (login.customer.accountStatus === "pending_activation") {
    return NextResponse.json({ error: "Activate your account from the email Tap Rater sent before logging in." }, { status: 403 });
  }

  if (login.customer.accountStatus === "disabled") {
    return NextResponse.json({ error: "This account is not active. Please contact Tap Rater support." }, { status: 403 });
  }

  return createLoginResponse(login.customer.email, request);
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

function passwordMatches(actual: string, expected: string) {
  return actual.length === expected.length && actual === expected;
}

function isConfiguredAdminEmail(email: string) {
  return Boolean(process.env.ADMIN_EMAIL) && normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL ?? "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
