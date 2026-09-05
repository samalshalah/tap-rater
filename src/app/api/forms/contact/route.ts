import { NextResponse } from "next/server";
import { ProductMediaStorageError, uploadProductMedia } from "@/lib/admin-media-storage";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { saveContactRequest } from "@/lib/request-repository";
import { sendRequestNotification } from "@/lib/request-notifications";
import { contactFormSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const rateLimit = await checkPublicRateLimit(request, "contact", "PUBLIC_FORM_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();

  const payload = await readContactPayload(request);
  const parsed = contactFormSchema.safeParse(payload.fields);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form fields and try again." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Request storage is not configured yet." }, { status: 503 });
  }

  try {
    let attachmentUrl = "";
    let attachmentFilename = "";

    if (payload.attachment) {
      const uploaded = await uploadProductMedia({
        file: payload.attachment,
        productSlug: "contact-design-help",
        role: "center_asset"
      });
      attachmentUrl = uploaded.url;
      attachmentFilename = uploaded.filename;
    }

    const message = attachmentUrl
      ? `${parsed.data.message}\n\nAttachment: ${attachmentUrl}`
      : parsed.data.message;

    await saveContactRequest(getSupabaseAdmin(), { ...parsed.data, message });
    await sendRequestNotification({
      subject: "New Tap Rater contact request",
      rows: {
        Name: parsed.data.name,
        Email: parsed.data.email,
        Message: parsed.data.message,
        ...(attachmentUrl ? { "Uploaded file": attachmentUrl, Filename: attachmentFilename } : {})
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProductMediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Request could not be saved." }, { status: 500 });
  }
}

async function readContactPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const attachment = form?.get("attachment");

    return {
      fields: {
        name: form?.get("name"),
        email: form?.get("email"),
        message: form?.get("message")
      },
      attachment: attachment instanceof File && attachment.size > 0 ? attachment : null
    };
  }

  return {
    fields: await request.json().catch(() => null),
    attachment: null
  };
}
