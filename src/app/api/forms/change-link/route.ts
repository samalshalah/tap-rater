import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { checkSupportFormDuplicate, checkSupportFormRateLimit, verifySupportForm } from "@/lib/support-form-security";
import { saveChangeLinkRequest } from "@/lib/request-repository";
import { sendRequestNotification } from "@/lib/request-notifications";
import { changeLinkFormSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const rateLimit = await checkSupportFormRateLimit(request);
  if (rateLimit) return rateLimit;

  const payload = await request.json().catch(() => null);
  const parsed = changeLinkFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the link change details and try again." }, { status: 400 });
  }

  const security = await verifySupportForm(request, "change-link", payload);
  if (security) return security;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Request storage is not configured yet." }, { status: 503 });
  }

  try {
    const duplicate = await checkSupportFormDuplicate(request, "change-link", parsed.data);
    if (duplicate) return duplicate;
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
