import type { CheckoutCartRow } from "@/lib/checkout";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { createManualOrderReference } from "@/lib/order-reference";
import type { CheckoutCustomerInput, CheckoutShippingAddressInput } from "@/lib/validators";
import { inferOrderProductionStatus, mapCheckoutRowsToOrderLineItems, mapCheckoutSessionToOrderInput, mergeOrderDetails, normalizeOrderRecord, normalizePrePaymentShippingAddress } from "./order-model";
import { guardedOrderUpdate, matchOrderField } from "./order-persistence";
import type { CheckoutPaymentFailureStatus, OrderRecord, OrderRefundSaveResult, OrdersDbClient, PaidOrderSaveResult, StripeCheckoutSessionLike } from "./order-types";
export {
  updateOrderFulfillment,
  updateOrderFulfillmentWithClient,
  applyAdminOrderProductionAction,
  applyAdminOrderProductionActionWithClient
} from "./order-fulfillment-actions";
export { ensurePaidOrderProductionArtwork,ensurePaidOrderProductionArtworkWithClient,getAdminOrderArtworkUrl,getOrderArtworkStorageKey } from "./order-artwork";

export { applyOrderLineItemFulfillmentInference,getOrderLineItemFulfillmentKind,getOrderLineItemProductionSummary,getOrderProductionBlockers,mapCheckoutRowsToOrderLineItems,mapCheckoutSessionToOrderInput } from "./order-model";

export { guardedOrderUpdate } from "./order-persistence";

export type { AdminOrderProductionActionInput,AdminOrderProductionActionResult,CheckoutPaymentFailureStatus,FulfillmentUpdateResult,OrderLineItem,OrderLineItemFulfillmentKind,OrderLineItemProductionSummary,OrderRecord,OrderRefundSaveResult,OrdersDbClient,PaidOrderSaveResult,ProductionStatus,ShippingStatus,StripeCheckoutSessionLike } from "./order-types";

export async function createPendingOrderForCheckout({
  stripeCheckoutSessionId,
  rows,
  subtotalCents,
  totalCents,
  currency,
  customer,
  shippingAddress,
  shippingAmountCents = 0,
  shippingMode = "manual",
  taxAmountCents = 0,
  taxSettings
}: {
  stripeCheckoutSessionId: string;
  rows: CheckoutCartRow[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
  customer: CheckoutCustomerInput;
  shippingAddress: CheckoutShippingAddressInput;
  shippingAmountCents?: number;
  shippingMode?: "manual" | "free" | "flat";
  taxAmountCents?: number;
  taxSettings?: {
    taxMode: string;
    manualTaxRateBps: number;
    taxLabel: string;
    taxableStates: string[];
    taxRecurring: boolean;
    taxShipping: boolean;
  };
}) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured. Checkout is disabled until order persistence is ready." };
  }

  return createPendingOrderForCheckoutWithClient(getSupabaseAdmin() as OrdersDbClient, {
    stripeCheckoutSessionId,
    rows,
    subtotalCents,
    totalCents,
    currency,
    customer,
    shippingAddress,
    shippingAmountCents,
    shippingMode,
    taxAmountCents,
    taxSettings
  });
}

export async function createPendingOrderForCheckoutWithClient(
  client: OrdersDbClient,
  input: {
    stripeCheckoutSessionId: string;
    rows: CheckoutCartRow[];
    subtotalCents: number;
    totalCents: number;
    currency: string;
    customer: CheckoutCustomerInput;
    shippingAddress: CheckoutShippingAddressInput;
    shippingAmountCents?: number;
    shippingMode?: "manual" | "free" | "flat";
    taxAmountCents?: number;
    taxSettings?: {
      taxMode: string;
      manualTaxRateBps: number;
      taxLabel: string;
      taxableStates: string[];
      taxRecurring: boolean;
      taxShipping: boolean;
    };
  }
) {
  const lineItems = mapCheckoutRowsToOrderLineItems(input.rows);
  const { error } = await insertPendingOrderOnce(client,
    {
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      status: "pending_payment",
      payment_status: "unpaid",
      email: input.customer.email,
      customer_name: input.customer.name,
      subtotal_cents: input.subtotalCents,
      total_cents: input.totalCents,
      currency: input.currency,
      line_items_json: lineItems,
      customer_details_json: {
        email: input.customer.email,
        name: input.customer.name,
        phone: input.customer.phone || input.shippingAddress.phone || null,
        create_account: input.customer.createAccount,
        source: "checkout_before_payment",
        tax_summary: input.taxSettings
          ? {
              mode: input.taxSettings.taxMode,
              label: input.taxSettings.taxLabel,
              rate_bps: input.taxSettings.manualTaxRateBps,
              amount_cents: input.taxAmountCents ?? 0,
              taxable_states: input.taxSettings.taxableStates,
              tax_recurring: input.taxSettings.taxRecurring,
              tax_shipping: input.taxSettings.taxShipping
            }
          : {
              mode: "manual",
              label: "Sales tax",
              rate_bps: 0,
              amount_cents: input.taxAmountCents ?? 0,
              tax_shipping: false
            }
      },
      shipping_address_json: normalizePrePaymentShippingAddress(input.shippingAddress),
      shipping_amount_cents: input.shippingAmountCents ?? 0,
      shipping_mode: input.shippingMode ?? "manual",
      updated_at: new Date().toISOString()
    }
  );

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function createManualPendingOrderForCheckout({
  rows,
  subtotalCents,
  totalCents,
  currency,
  customerEmail,
  customerName,
  shippingAmountCents = 0,
  shippingMode = "manual",
  orderReference = createManualOrderReference()
}: {
  rows: CheckoutCartRow[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  shippingAmountCents?: number;
  shippingMode?: "manual" | "free" | "flat";
  orderReference?: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false as const, error: "Database persistence is not configured. Checkout is disabled until order persistence is ready." };
  }

  const lineItems = mapCheckoutRowsToOrderLineItems(rows);
  const productionStatus = inferOrderProductionStatus(lineItems);
  const now = new Date().toISOString();
  const order: OrderRecord = {
    stripe_checkout_session_id: orderReference,
    status: "pending_payment",
    payment_status: "manual_unpaid",
    email: customerEmail,
    customer_name: customerName?.trim() || null,
    subtotal_cents: subtotalCents,
    total_cents: totalCents,
    currency,
    line_items_json: lineItems,
    customer_details_json: {
      email: customerEmail,
      name: customerName?.trim() || null,
      source: "manual_checkout"
    },
    shipping_address_json: null,
    shipping_amount_cents: shippingAmountCents,
    shipping_mode: shippingMode,
    production_status: productionStatus,
    shipping_status: "not_shipped",
    shipping_method: null,
    shipping_carrier: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    internal_notes: "Manual unpaid order submitted from cart while Stripe checkout is bypassed.",
    admin_fulfillment_notes: "",
    updated_at: now
  };
  const { data, error } = await insertPendingOrderOnce(getSupabaseAdmin() as OrdersDbClient, order);
  const savedOrder = data ? normalizeOrderRecord(data) : order;
  return error
    ? { ok: false as const, error: error.message }
    : { ok: true as const, orderReference, orderId: savedOrder.id, order: savedOrder };
}

async function insertPendingOrderOnce(client: OrdersDbClient, payload: Record<string, unknown>) {
  const read = () => client.from("orders").select("*").eq("stripe_checkout_session_id", payload.stripe_checkout_session_id).maybeSingle();
  const existing = await read();
  if (existing.error || existing.data) return existing;
  const inserted = await client.from("orders").insert(payload).select("*").maybeSingle();
  if (!inserted.error && inserted.data) return inserted;
  const concurrent = await read();
  return concurrent.data && !concurrent.error ? concurrent : { data: null, error: inserted.error ?? concurrent.error ?? { message: "Pending order could not be saved." } };
}

export async function savePaidOrderFromCheckoutSession(session: StripeCheckoutSessionLike): Promise<PaidOrderSaveResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured." };
  }

  return savePaidOrderFromCheckoutSessionWithClient(getSupabaseAdmin() as OrdersDbClient, session);
}

export async function markCheckoutOrderPaymentFailure(
  stripeCheckoutSessionId: string,
  status: CheckoutPaymentFailureStatus,
  paymentStatus: "failed" | "expired"
) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false as const, error: "Database persistence is not configured." };
  }

  return markCheckoutOrderPaymentFailureWithClient(
    getSupabaseAdmin() as OrdersDbClient,
    stripeCheckoutSessionId,
    status,
    paymentStatus
  );
}

export async function markCheckoutOrderPaymentFailureWithClient(
  client: OrdersDbClient,
  stripeCheckoutSessionId: string,
  status: CheckoutPaymentFailureStatus,
  paymentStatus: "failed" | "expired"
) {
  const { error } = await client
    .from("orders")
    .update({
      status,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    })
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .eq("status", "pending_payment");

  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function savePaidOrderFromCheckoutSessionWithClient(
  client: OrdersDbClient,
  session: StripeCheckoutSessionLike
): Promise<PaidOrderSaveResult> {
  const order = mapCheckoutSessionToOrderInput(session);

  if (!order.stripe_checkout_session_id) {
    return { ok: false, error: "Missing Stripe Checkout Session ID." };
  }

  if (session.payment_status !== "paid") return { ok: false, error: "Checkout payment is not confirmed." };
  const lookup = await client.from("orders").select("*").eq("stripe_checkout_session_id", order.stripe_checkout_session_id).maybeSingle();
  if (lookup.error) return { ok: false, error: lookup.error.message };
  const existingOrder = lookup.data ? normalizeOrderRecord(lookup.data) : null;
  if (existingOrder && (existingOrder.stripe_refund_id || existingOrder.refund_status || existingOrder.payment_status?.includes("refund"))) {
    return { ok: true, order: existingOrder, wasAlreadyPaid: true, paymentReversed: true };
  }
  const wasAlreadyPaid = existingOrder?.status === "paid" || existingOrder?.payment_status === "paid";
  if (existingOrder && wasAlreadyPaid) {
    const billingFields = ["invoice_number", "invoice_pdf_url", "hosted_invoice_url", "receipt_url"] as const;
    const billingUpdates = Object.fromEntries(billingFields.flatMap(key => {
      const value = order.customer_details_json?.[key];
      return typeof value === "string" && value && value !== existingOrder.customer_details_json?.[key] ? [[key, value]] : [];
    }));
    if (Object.keys(billingUpdates).length) {
      const details = { ...existingOrder.customer_details_json, ...billingUpdates };
      const repaired = await guardedOrderUpdate(client, existingOrder, { customer_details_json: details }).select("id").maybeSingle();
      if (repaired.error || !repaired.data) return { ok: false, error: repaired.error?.message ?? "Invoice details changed. Retry the event." };
      existingOrder.customer_details_json = details;
    }
    if (!existingOrder.stripe_payment_intent_id && order.stripe_payment_intent_id) {
      const repaired = await matchOrderField(
        guardedOrderUpdate(client, existingOrder, { stripe_payment_intent_id: order.stripe_payment_intent_id }),
        "stripe_payment_intent_id", null
      ).select("id").maybeSingle();
      if (repaired.error || !repaired.data) return { ok: false, error: repaired.error?.message ?? "Payment reference changed. Retry the event." };
      existingOrder.stripe_payment_intent_id = order.stripe_payment_intent_id;
    }
    return { ok: true, order: existingOrder, wasAlreadyPaid: true };
  }
  const shouldPreserveExistingLineItems = Boolean(existingOrder?.line_items_json.length);
  const mergedLineItems = shouldPreserveExistingLineItems
    ? existingOrder?.line_items_json ?? []
    : order.line_items_json.length > 0
      ? order.line_items_json
      : existingOrder?.line_items_json ?? [];
  const mergedOrder: OrderRecord = {
    ...existingOrder,
    ...order,
    line_items_json: mergedLineItems
  };

  const payload: Record<string, unknown> = { ...order };
  if (shouldPreserveExistingLineItems || (mergedOrder.line_items_json.length > 0 && order.line_items_json.length === 0)) {
    payload.line_items_json = mergedOrder.line_items_json;
  } else if (order.line_items_json.length === 0) {
    delete payload.line_items_json;
  }

  if (existingOrder) {
    payload.production_status = existingOrder.production_status;
    payload.shipping_status = existingOrder.shipping_status;
    payload.shipping_method = existingOrder.shipping_method;
    payload.shipping_carrier = existingOrder.shipping_carrier;
    payload.tracking_number = existingOrder.tracking_number;
    payload.tracking_url = existingOrder.tracking_url;
    payload.shipped_at = existingOrder.shipped_at;
    payload.internal_notes = existingOrder.internal_notes;
    payload.admin_fulfillment_notes = existingOrder.admin_fulfillment_notes;
    // Recovery uses the approved shipping address; Stripe may return a different
    // (or partial) billing address from its hosted payment page.
    payload.shipping_address_json = existingOrder.customer_details_json?.recovery_original_order_id
      ? existingOrder.shipping_address_json
      : order.shipping_address_json ?? existingOrder.shipping_address_json ?? null;
    payload.customer_details_json = mergeOrderDetails(existingOrder.customer_details_json, order.customer_details_json);
    payload.email = order.email ?? existingOrder.email;
    payload.customer_name = order.customer_name ?? existingOrder.customer_name;
    payload.shipping_amount_cents = order.shipping_amount_cents || existingOrder.shipping_amount_cents;
    payload.shipping_mode = order.shipping_mode ?? existingOrder.shipping_mode ?? null;
  }

  // Compare-and-set prevents a concurrent refund/payment transition being lost.
  const query = existingOrder
    ? guardedOrderUpdate(client, existingOrder, payload)
    : client.from("orders").insert(payload);
  const { data: savedOrder, error } = await query.select("*").maybeSingle();

  return error || !savedOrder
    ? { ok: false, error: error?.message ?? "Order changed during payment processing. Retry the event." }
    : { ok: true, order: savedOrder ? normalizeOrderRecord(savedOrder) : mergedOrder, wasAlreadyPaid };
}

export async function getAdminOrders(): Promise<{ configured: boolean; orders: OrderRecord[] }> {
  if (!hasSupabaseAdminConfig()) {
    return { configured: false, orders: [] };
  }

  try {
    const { data, error } = await (getSupabaseAdmin() as OrdersDbClient)
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !Array.isArray(data)) {
      return { configured: true, orders: [] };
    }

    return { configured: true, orders: data.map(normalizeOrderRecord) };
  } catch {
    return { configured: true, orders: [] };
  }
}

export async function getAdminOrderById(orderId: string): Promise<{ configured: boolean; order: OrderRecord | null }> {
  if (!hasSupabaseAdminConfig()) {
    return { configured: false, order: null };
  }

  try {
    const { data, error } = await (getSupabaseAdmin() as OrdersDbClient)
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) {
      return { configured: true, order: null };
    }

    return { configured: true, order: normalizeOrderRecord(data) };
  } catch {
    return { configured: true, order: null };
  }
}

export async function getCustomerOrderById(orderId: string, email: string): Promise<{ configured: boolean; order: OrderRecord | null }> {
  if (!hasSupabaseAdminConfig()) return { configured: false, order: null };
  const order = await getCustomerOrderByIdWithClient(getSupabaseAdmin() as OrdersDbClient, orderId, email);
  return { configured: true, order };
}

export async function getCustomerOrderByIdWithClient(client: OrdersDbClient, orderId: string, email: string): Promise<OrderRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const { data, error } = await client.from("orders").select("*")
    .eq("id", orderId).eq("email", normalizedEmail).maybeSingle();
  if (error) throw new Error("Customer order storage is unavailable.");
  if (!data) return null;
  const order = normalizeOrderRecord(data);
  return order.id === orderId && order.email?.trim().toLowerCase() === normalizedEmail ? order : null;
}

export async function markAdminOrderRefunded(
  orderId: string,
  refundId: string,
  refundedAt: string,
): Promise<OrderRefundSaveResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured." };
  }

  return markAdminOrderRefundedWithClient(
    getSupabaseAdmin() as OrdersDbClient,
    orderId,
    refundId,
    refundedAt,
  );
}

export async function markAdminOrderRefundedWithClient(
  client: OrdersDbClient,
  orderId: string,
  refundId: string,
  refundedAt: string,
): Promise<OrderRefundSaveResult> {
  const { error } = await client
    .from("orders")
    .update({
      status: "canceled",
      payment_status: "refunded",
      stripe_refund_id: refundId,
      refunded_at: refundedAt,
      updated_at: refundedAt,
    })
    .eq("id", orderId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

async function getOrderByStripeCheckoutSessionId(client: OrdersDbClient, stripeCheckoutSessionId: string): Promise<OrderRecord | null> {
  try {
    const query = client
      .from("orders")
      .select("*")
      .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
      .maybeSingle();
    const { data, error } = await query;

    if (error || !data) {
      return null;
    }

    return normalizeOrderRecord(data);
  } catch {
    return null;
  }
}
