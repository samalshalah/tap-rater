import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { checkSupportFormDuplicate, checkSupportFormRateLimit, verifySupportForm } from "@/lib/support-form-security";
import { saveSetupRequest } from "@/lib/request-repository";
import { sendRequestNotification } from "@/lib/request-notifications";
import { setupFormSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const rateLimit = await checkSupportFormRateLimit(request);
  if (rateLimit) return rateLimit;

  const payload = await request.json().catch(() => null);
  const parsed = setupFormSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the setup details and try again." }, { status: 400 });
  }

  const security = await verifySupportForm(request, "setup", payload);
  if (security) return security;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Request storage is not configured yet." }, { status: 503 });
  }

  try {
    const duplicate = await checkSupportFormDuplicate(request, "setup", parsed.data);
    if (duplicate) return duplicate;
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
