import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminCookieName, createAdminSessionValue } from "@/lib/admin-auth";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth-rate-limit";
import { getCustomerPasswordLoginRecord, verifyCustomerPassword } from "@/lib/customer-account";
import { createCustomerSessionValue, customerCookieName } from "@/lib/customer-auth";
import { accountLoginRequestSchema } from "@/lib/validators";

const customerSessionMaxAgeSeconds = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const loginStartedAt = Date.now();
  const parsed = accountLoginRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const adminLogin = isConfiguredAdminEmail(email);
  const rateLimit = await checkLoginRateLimit({
    headers: request.headers,
    identifier: email,
    scope: adminLogin ? "admin" : "customer"
  });

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (adminLogin) {
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword || !passwordMatches(password, expectedPassword)) {
      await recordLoginAttempt(rateLimit.context, false);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    await recordLoginAttempt(rateLimit.context, true);
    return createAdminLoginResponse(email, request);
  }

  const login = await getCustomerPasswordLoginRecord(email);
  if (!login.configured) {
    return NextResponse.json({ error: "Customer login is not configured yet." }, { status: 503 });
  }

  if (!login.customer || !verifyCustomerPassword(password, login.customer.passwordHash)) {
    await recordLoginAttempt(rateLimit.context, false);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (login.customer.accountStatus === "pending_activation") {
    return NextResponse.json({ error: "Activate your account from the email Tap Rater sent before logging in." }, { status: 403 });
  }

  if (login.customer.accountStatus === "disabled") {
    return NextResponse.json({ error: "This account is not active. Please contact Tap Rater support." }, { status: 403 });
  }

  await recordLoginAttempt(rateLimit.context, true);
  return createLoginResponse(login.customer.email, request, loginStartedAt);
}

function createLoginResponse(email: string, request: Request, issuedAt: number) {
  const response = NextResponse.json({ ok: true, redirectTo: "/account" });
  response.cookies.set(customerCookieName, createCustomerSessionValue(email, issuedAt), {
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
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function isConfiguredAdminEmail(email: string) {
  return Boolean(process.env.ADMIN_EMAIL) && normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL ?? "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
