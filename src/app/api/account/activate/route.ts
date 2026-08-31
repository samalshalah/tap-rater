import { NextResponse } from "next/server";
import { activateCustomerAccount } from "@/lib/customer-account";
import { createCustomerSessionValue, customerCookieName } from "@/lib/customer-auth";
import { accountActivateSchema } from "@/lib/validators";

const customerSessionMaxAgeSeconds = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  const parsed = accountActivateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid activation link and a password with at least 8 characters." }, { status: 400 });
  }

  const result = await activateCustomerAccount(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ ok: true, redirectTo: "/account" });
  response.cookies.set(customerCookieName, createCustomerSessionValue(result.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: customerSessionMaxAgeSeconds
  });
  return response;
}
