import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { saveChangeLinkRequest } from "@/lib/request-repository";
import { sendRequestNotification } from "@/lib/request-notifications";
import { changeLinkFormSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const rateLimit = await checkPublicRateLimit(request, "change-link", "PUBLIC_FORM_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();

  const parsed = changeLinkFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the link change details and try again." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Request storage is not configured yet." }, { status: 503 });
  }

  try {
    await saveChangeLinkRequest(getSupabaseAdmin(), parsed.data);
    await sendRequestNotification({
      subject: "New Tap Rater link change request",
      rows: {
        Name: parsed.data.name,
        Email: parsed.data.email,
        "TapRater ID": parsed.data.tapraterId,
        "New Review URL": parsed.data.newReviewUrl,
        Notes: parsed.data.notes
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Link change request could not be saved." }, { status: 500 });
  }
}
