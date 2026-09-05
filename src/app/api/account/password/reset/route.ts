import { after, NextResponse } from "next/server";
import { consumeCustomerRecoveryAttempt } from "@/lib/auth-rate-limit";
import { customerCookieName } from "@/lib/customer-auth";
import { resetCustomerPassword } from "@/lib/customer-password-reset";
import { sendCustomerPasswordChangedEmail } from "@/lib/email";
import { accountResetPasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = accountResetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Use a valid reset link and matching passwords between 8 and 200 characters." }, { status: 400 });
  }
  const limit = await consumeCustomerRecoveryAttempt(request.headers, `reset:${parsed.data.token}`);
  if (!limit.available) return NextResponse.json({ error: "Password recovery is temporarily unavailable. Please try again later." }, { status: 503 });
  if (limit.limited) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and request a new link." }, {
      status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) }
    });
  }
  try {
    const result = await resetCustomerPassword(parsed.data.token, parsed.data.password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    after(async () => {
      try { await sendCustomerPasswordChangedEmail(result.email); }
      catch { console.error("Customer password change notification could not be sent."); }
    });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(customerCookieName, "", { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "Your password could not be reset. Please try again later." }, { status: 503 });
  }
}
