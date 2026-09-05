import { runCommerceRecovery } from "@/lib/commerce-recovery";
import { NextResponse } from "next/server";
import { getStripeClient, validateStripeWebhookConfig } from "@/lib/checkout";
import { readRequestTextWithLimit, RequestBodyTooLargeError } from "@/lib/http-request";

const maxWebhookBodyBytes = 1024 * 1024;

export async function POST(request: Request) {
  const stripeConfig = validateStripeWebhookConfig();
  const signature = request.headers.get("stripe-signature");

  if (!stripeConfig.ok) {
    return NextResponse.json({ error: stripeConfig.error }, { status: 503 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Stripe signature is missing." }, { status: 400 });
  }

  let payload: string;
  try {
    payload = await readRequestTextWithLimit(request, maxWebhookBodyBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Stripe webhook payload is too large." }, { status: 413 });
    }
    throw error;
  }
  let event: ReturnType<ReturnType<typeof getStripeClient>["webhooks"]["constructEvent"]>;

  try {
    event = getStripeClient().webhooks.constructEvent(payload, signature, stripeConfig.webhookSecret!);
  } catch {
    return NextResponse.json({ error: "Stripe webhook signature verification failed." }, { status: 400 });
  }

  return runCommerceRecovery(event, new URL(request.url).origin);
}
