import { NextResponse } from "next/server";
import { activateDevice } from "@/lib/device-activation";
import { hashIpAddress } from "@/lib/device-redirect";
import { activationFormSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = activationFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the activation details and try again." }, { status: 400 });
  }

  const result = await activateDevice(parsed.data, {
    ipHash: hashIpAddress(getRequestIp(request.headers))
  });

  if (!result.ok) {
    const status = result.reason === "configuration_missing" ? 503 : result.reason === "rate_limited" ? 429 : 400;
    return NextResponse.json({ error: result.message, reason: result.reason }, { status });
  }

  return NextResponse.json(result);
}

function getRequestIp(headers: Headers) {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cloudflareIp || forwardedFor || headers.get("x-real-ip")?.trim() || undefined;
}
