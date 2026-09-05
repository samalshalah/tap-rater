import { after, NextResponse } from "next/server";
import { consumeCustomerRecoveryAttempt } from "@/lib/auth-rate-limit";
import { requestCustomerPasswordReset } from "@/lib/customer-password-reset";
import { hasResendApiKey } from "@/lib/email";
import { accountForgotPasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = accountForgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const limit = await consumeCustomerRecoveryAttempt(request.headers, `request:${parsed.data.email.toLowerCase()}`);
  if (!limit.available || !hasResendApiKey()) {
    return NextResponse.json({ error: "Password recovery is temporarily unavailable. Please try again later or contact support." }, { status: 503 });
  }
  if (limit.limited) {
    return NextResponse.json({ error: "Too many requests. Please wait 15 minutes and try again." }, {
      status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) }
    });
  }
  // Account lookup and email delivery happen after the identical public response.
  after(async () => {
    try {
      await requestCustomerPasswordReset(parsed.data.email);
    } catch {
      console.error("Customer password recovery could not be processed.");
    }
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
