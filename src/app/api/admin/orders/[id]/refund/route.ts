import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { refundAdminOrder } from "@/lib/order-refunds";
import { liveDb } from "@/lib/google-business/live-reviews";
import { changeMultiLinkSubscription } from "@/lib/multilink-subscription-actions";

type RefundRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RefundRouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Order identifier is invalid." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "REFUND") {
    return NextResponse.json(
      { error: "Confirm the full refund before continuing." },
      { status: 400 },
    );
  }
  const result = await refundAdminOrder(id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // A refunded Multi-Link order should not keep billing $9.99 a month: end its subscription too.
  let subscriptionError: string | null = null;
  if (body?.cancelSubscription === true) {
    try {
      const rows = await liveDb()`SELECT stripe_subscription_id FROM hosted_subscriptions WHERE order_id=${id}::uuid AND stripe_subscription_id LIKE sub_%` as { stripe_subscription_id: string }[];
      for (const row of rows) {
        const cancelled = await changeMultiLinkSubscription(row.stripe_subscription_id, "cancel_now");
        if (!cancelled.ok) subscriptionError = cancelled.error;
      }
    } catch {
      subscriptionError = "The refund went through, but the Multi-Link subscription could not be cancelled. Cancel it in Subscriptions.";
    }
  }

  return NextResponse.json({
    ok: true,
    ...(subscriptionError ? { subscriptionError } : {}),
    refundId: result.refundId,
    refundStatus: result.refundStatus,
    alreadyRefunded: result.alreadyRefunded,
  });
}
