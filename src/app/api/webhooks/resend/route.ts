import { NextResponse } from "next/server";
import { Resend } from "resend";
import { applyResendWebhookEvent } from "@/lib/email-deliveries";

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Resend webhook signing secret is not configured." }, { status: 503 });
  }

  const payload = await request.text();
  let event;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? ""
      },
      webhookSecret
    });
  } catch {
    return NextResponse.json({ error: "Resend webhook signature verification failed." }, { status: 400 });
  }

  const result = await applyResendWebhookEvent(event);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ received: true, matched: result.matched });
}
