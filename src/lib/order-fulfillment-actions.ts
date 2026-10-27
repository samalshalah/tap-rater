import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { buildProofApprovalSnapshot } from "@/lib/direct-production";
import { canAdvanceOrderFulfillment, canRunOrderProductionActions, validateOrderFulfillmentTransition } from "@/lib/order-fulfillment-rules";
import { buildCurrentApprovalSnapshot, generateProductionArtworkForOrderLineItem, readProductionArtworkReference, type ProductionArtworkAssetResolver, type ProductionArtworkStorage } from "@/lib/production-artwork";
import { sendShippingNotificationEmail, type ShippingEmailInput } from "@/lib/shipping-emails";
import { withStripeResourceLock, type StripeProcessingGuard } from "@/lib/stripe-processing";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";
import { canReuseOrderArtwork, getAdminOrderArtworkUrl, hasProvisionedArtworkTargets, withoutProductionArtwork } from "./order-artwork";
import { applyOrderLineItemFulfillmentInference, getOrderLineItemProductionSummary, getOrderProductionBlockers, inferOrderProductionStatus, normalizeOrderRecord } from "./order-model";
import { guardedOrderUpdate } from "./order-persistence";
import type { AdminOrderProductionActionInput, AdminOrderProductionActionResult, FulfillmentUpdateResult, OrderRecord, OrdersDbClient, ProductionStatus, ShippingStatus } from "./order-types";

export async function updateOrderFulfillment(orderId: string, input: OrderFulfillmentUpdateInput): Promise<FulfillmentUpdateResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured.", status: 503 };
  }

  return updateOrderFulfillmentWithClient(getSupabaseAdmin() as OrdersDbClient, orderId, input);
}

export async function updateOrderFulfillmentWithClient(
  client: OrdersDbClient,
  orderId: string,
  input: OrderFulfillmentUpdateInput,
  options: {
    sendShippingNotificationEmailFn?: (input: ShippingEmailInput) => ReturnType<typeof sendShippingNotificationEmail>;
    now?: () => string;
  } = {}
): Promise<FulfillmentUpdateResult> {
  const existingOrder = await getOrderByIdForFulfillment(client, orderId);
  if (!existingOrder) {
    return { ok: false, error: "Order was not found.", status: 404 };
  }

  if (
    !canAdvanceOrderFulfillment(existingOrder) &&
    (
      input.productionStatus !== existingOrder.production_status ||
      (input.markShipped ? "shipped" : input.shippingStatus) !== existingOrder.shipping_status ||
      input.shippingMethod !== (existingOrder.shipping_method ?? "") ||
      input.shippingCarrier !== (existingOrder.shipping_carrier ?? "") ||
      input.trackingNumber !== (existingOrder.tracking_number ?? "") ||
      input.trackingUrl !== (existingOrder.tracking_url ?? "")
    )
  ) {
    return { ok: false, error: "Only internal notes can be changed until payment is confirmed.", status: 409 };
  }

  const transition = validateOrderFulfillmentTransition(existingOrder, input);
  if (!transition.ok) return transition;

  const advancesProduction = input.productionStatus !== existingOrder.production_status &&
    ["ready_for_production", "in_production", "completed"].includes(input.productionStatus);
  const advancesShipping = transition.shippingStatus !== existingOrder.shipping_status &&
    ["ready_to_ship", "shipped", "delivered"].includes(transition.shippingStatus);
  if (canRunOrderProductionActions(existingOrder) && (advancesProduction || advancesShipping)) {
    const blockers = getOrderProductionBlockers(existingOrder);
    if (blockers.length) {
      return { ok: false, error: `Resolve production setup before advancing fulfillment. ${blockers.join("; ")}`, status: 409 };
    }
  }

  const now = options.now?.() ?? new Date().toISOString();
  const shippingStatus = transition.shippingStatus;
  const shouldSendShippingEmail =
    transition.isFirstShippedTransition &&
    Boolean(existingOrder.email) &&
    Boolean(input.trackingNumber || input.trackingUrl);
  const payload: Record<string, unknown> = {
    production_status: input.productionStatus,
    shipping_status: shippingStatus,
    shipping_method: input.shippingMethod,
    shipping_carrier: input.shippingCarrier,
    tracking_number: input.trackingNumber,
    tracking_url: input.trackingUrl,
    internal_notes: input.internalNotes,
    admin_fulfillment_notes: input.adminFulfillmentNotes,
    updated_at: now
  };

  if (shippingStatus === "shipped" || shippingStatus === "delivered") {
    payload.shipped_at = existingOrder.shipped_at ?? now;
  }

  const { data, error } = await guardedOrderUpdate(client, existingOrder, payload).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Order changed during fulfillment. Retry the action.", status: 409 };

  if (!shouldSendShippingEmail) {
    return { ok: true };
  }

  let shippingEmail: Awaited<ReturnType<typeof sendShippingNotificationEmail>>;
  try {
    shippingEmail = await (options.sendShippingNotificationEmailFn ?? sendShippingNotificationEmail)({
      order: {
        ...existingOrder,
        production_status: input.productionStatus,
        shipping_status: "shipped",
        shipping_method: input.shippingMethod,
        shipping_carrier: input.shippingCarrier,
        tracking_number: input.trackingNumber,
        tracking_url: input.trackingUrl,
        internal_notes: input.internalNotes,
        admin_fulfillment_notes: input.adminFulfillmentNotes,
        shipped_at: existingOrder.shipped_at ?? now,
        updated_at: now
      }
    });
  } catch {
    shippingEmail = { sent: false, reason: "email_send_exception" };
  }

  if (!shippingEmail.sent) {
    console.warn("[orders] shipping_email_not_sent", {
      orderId,
      reason: shippingEmail.reason
    });
  }

  return { ok: true, shippingEmail };
}

export async function applyAdminOrderProductionAction(orderId: string, input: AdminOrderProductionActionInput): Promise<AdminOrderProductionActionResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured.", status: 503 };
  }

  const client = getSupabaseAdmin() as OrdersDbClient;
  const order = await getOrderByIdForFulfillment(client, orderId);
  if (!order) return { ok: false, error: "Order was not found.", status: 404 };
  return withStripeResourceLock(client, `payment:${order.stripe_payment_intent_id ?? order.stripe_checkout_session_id}`, (assertActive) =>
    applyAdminOrderProductionActionWithClient(client, orderId, input, { assertActive }));
}

export async function applyAdminOrderProductionActionWithClient(
  client: OrdersDbClient,
  orderId: string,
  input: AdminOrderProductionActionInput,
  options: {
    storage?: ProductionArtworkStorage;
    assetResolver?: ProductionArtworkAssetResolver;
    artworkExists?: (key: string) => Promise<boolean>;
    assertActive?: StripeProcessingGuard;
  } = {}
): Promise<AdminOrderProductionActionResult> {
  const existingOrder = await getOrderByIdForFulfillment(client, orderId);
  if (!existingOrder) {
    return { ok: false, error: "Order was not found.", status: 404 };
  }
  if (existingOrder.status !== "paid" || !["paid", "complimentary"].includes(existingOrder.payment_status ?? "") || existingOrder.stripe_refund_id || existingOrder.refund_status) {
    return {
      ok: false,
      error: "Production actions are unavailable until payment is confirmed.",
      status: 409
    };
  }
  if (!canRunOrderProductionActions(existingOrder)) {
    return {
      ok: false,
      error: "Production actions are unavailable after an order has shipped.",
      status: 409
    };
  }

  const now = new Date().toISOString();
  let lineItems = existingOrder.line_items_json.map(applyOrderLineItemFulfillmentInference);
  let productionStatus: ProductionStatus = existingOrder.production_status;
  let shippingStatus: ShippingStatus = existingOrder.shipping_status;
  const actionNote = formatProductionActionNote(input.action, input.note, now);

  if (input.action === "request_customer_changes") {
    productionStatus = "blocked";
    shippingStatus = "blocked";
    lineItems = lineItems.map((item) => item.optionId === "branded_qr_direct"
      ? { ...item, proofApproved: false, setup: { ...item.setup, proofApproved: false, proofApprovalSnapshot: undefined, proofApprovedAt: undefined } }
      : item);
  } else {
    if (lineItems.some((item) => item.optionId === "branded_qr_direct" && !hasProvisionedArtworkTargets(item))) {
      return { ok: false, error: "Hosted artwork requires the provisioned permanent QR and NFC destination.", status: 409 };
    }
    if (input.action === "approve_proof_manually") {
      lineItems = lineItems.map((item) => {
        const summary = getOrderLineItemProductionSummary(item);
        if (summary.fulfillmentKind !== "branded" && summary.fulfillmentKind !== "custom" && item.optionId !== "branded_qr_direct") {
          return item;
        }

        const approvedSnapshot = buildProofApprovalSnapshot(buildCurrentApprovalSnapshot(item));
        return {
          ...item,
          proofApproved: true,
          setup: {
            ...item.setup,
            proofApprovalSnapshot: approvedSnapshot,
            proofApprovedAt: now
          }
        };
      });
    }

    lineItems = await Promise.all(
      lineItems.map(async (item, index) => {
        if (item.optionId !== "branded_qr_direct") return item;
        await options.assertActive?.();
        const reusable = await canReuseOrderArtwork({ ...existingOrder, line_items_json: lineItems }, index, options);
        const generated = reusable ? item : await generateProductionArtworkForOrderLineItem(
              {
                orderReference: existingOrder.stripe_checkout_session_id || existingOrder.id || orderId,
                lineItemIndex: index,
                item: withoutProductionArtwork(item),
                assetResolver: options.assetResolver
              },
              options.storage
            );
        const reference = readProductionArtworkReference(generated);
        return { ...generated, setup: { ...generated.setup, ...(reference ? { productionArtwork: {
          ...reference, url: reference.status === "generated" ? getAdminOrderArtworkUrl(existingOrder, index) : undefined
        } } : {}) } };
      })
    );
    lineItems = lineItems.map(applyOrderLineItemFulfillmentInference);
    productionStatus = inferOrderProductionStatus(lineItems);
  }

  const updatedOrder: OrderRecord = {
    ...existingOrder,
    line_items_json: lineItems,
    production_status: productionStatus,
    shipping_status: shippingStatus,
    internal_notes: appendAdminNote(existingOrder.internal_notes, actionNote),
    updated_at: now
  };

  await options.assertActive?.();
  const { data, error } = await guardedOrderUpdate(client, existingOrder, {
      line_items_json: updatedOrder.line_items_json,
      production_status: updatedOrder.production_status,
      shipping_status: updatedOrder.shipping_status,
      internal_notes: updatedOrder.internal_notes,
      updated_at: now
    }).select("*").maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? "Order changed during artwork processing. Retry the action." };
  const savedOrder = normalizeOrderRecord(data);
  if (input.action !== "request_customer_changes" && savedOrder.line_items_json.some((item) =>
    item.optionId === "branded_qr_direct" && readProductionArtworkReference(item)?.status !== "generated")) {
    return { ok: false, error: "Production artwork could not be completed. Retry the action after resolving the artwork error.", status: 503 };
  }
  return { ok: true, order: savedOrder };
}

async function getOrderByIdForFulfillment(client: OrdersDbClient, orderId: string): Promise<OrderRecord | null> {
  try {
    const query = client
      .from("orders")
      .select("*")
      .eq("id", orderId)
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

function appendAdminNote(existing: string, note: string) {
  return [existing?.trim(), note].filter(Boolean).join("\n\n");
}

function formatProductionActionNote(action: AdminOrderProductionActionInput["action"], note: string | undefined, timestamp: string) {
  const label =
    action === "approve_proof_manually"
      ? "Admin approved proof manually and regenerated production artwork."
      : action === "regenerate_artwork"
      ? "Admin regenerated production artwork."
      : "Admin requested customer changes.";
  const cleanNote = note?.trim();
  return cleanNote ? `[${timestamp}] ${label}\n${cleanNote}` : `[${timestamp}] ${label}`;
}
