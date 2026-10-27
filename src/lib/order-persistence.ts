import type { OrderRecord,OrdersDbClient } from "./order-types";

export function matchOrderField(query: any, field: string, value: unknown) {
  // PostgREST needs IS NULL; the local/Neon adapters translate eq(null) themselves.
  return value == null && typeof query.is === "function" ? query.is(field, null) : query.eq(field, value ?? null);
}

export function guardedOrderUpdate(client: OrdersDbClient, order: OrderRecord, payload: Record<string, unknown>) {
  const previousTime = Date.parse(order.updated_at ?? "");
  const updatedAt = new Date(Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
  let query = client.from("orders").update({ ...payload, updated_at: updatedAt }).eq("stripe_checkout_session_id", order.stripe_checkout_session_id);
  for (const field of ["updated_at", "status", "payment_status", "stripe_refund_id", "refund_status", "shipping_status", "shipped_at"] as const) {
    query = matchOrderField(query, field, order[field]);
  }
  return query;
}

