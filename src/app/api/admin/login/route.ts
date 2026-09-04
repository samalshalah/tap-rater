import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminCookieName, createAdminSessionValue } from "@/lib/admin-auth";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/auth-rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const isHttps = new URL(request.url).protocol === "https:";

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin login is not configured." }, { status: 503 });
  }

  const rateLimit = await checkLoginRateLimit({ headers: request.headers, identifier: email, scope: "admin" });
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (email !== process.env.ADMIN_EMAIL.trim().toLowerCase() || !passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    await recordLoginAttempt(rateLimit.context, false);
    return NextResponse.json({ error: "Invalid admin login." }, { status: 401 });
  }

  await recordLoginAttempt(rateLimit.context, true);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, createAdminSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/"
  });
  return response;
}

function passwordMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
