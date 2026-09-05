import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { saveSetupRequest } from "@/lib/request-repository";
import { sendRequestNotification } from "@/lib/request-notifications";
import { setupFormSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const rateLimit = await checkPublicRateLimit(request, "setup", "PUBLIC_FORM_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();

  const parsed = setupFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the setup details and try again." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Request storage is not configured yet." }, { status: 503 });
  }

  try {
    await saveSetupRequest(getSupabaseAdmin(), parsed.data);
    await sendRequestNotification({
      subject: "New Tap Rater setup request",
      rows: {
        Name: parsed.data.name,
        Email: parsed.data.email,
        Business: parsed.data.businessName,
        "Review URL": parsed.data.reviewUrl,
        Notes: parsed.data.notes
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Setup request could not be saved." }, { status: 500 });
  }
}
