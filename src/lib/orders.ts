import { getProductMediaObject, isSafeProductMediaKey } from "@/lib/admin-media-storage";
import type { CheckoutCartRow } from "@/lib/checkout";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { buildProofApprovalSnapshot, isProofApprovalSnapshotCurrent } from "@/lib/direct-production";
import { canAdvanceOrderFulfillment, canRunOrderProductionActions, validateOrderFulfillmentTransition } from "@/lib/order-fulfillment-rules";
import { createManualOrderReference } from "@/lib/order-reference";
import {
  buildCurrentApprovalSnapshot,
  generateProductionArtworkForOrderLineItem,
  getProductionArtworkTemplate,
  readProductionArtworkReference,
  type ProductionArtworkAssetResolver,
  type ProductionArtworkStorage
} from "@/lib/production-artwork";
import { sendShippingNotificationEmail, type ShippingEmailInput } from "@/lib/shipping-emails";
import { withStripeResourceLock, type StripeProcessingGuard } from "@/lib/stripe-processing";
import type { CheckoutCustomerInput, CheckoutShippingAddressInput, OrderFulfillmentUpdateInput } from "@/lib/validators";
import { createHash } from "node:crypto";
import { applyOrderLineItemFulfillmentInference, getOrderLineItemFulfillmentKind, getOrderLineItemProductionSummary, getOrderProductionBlockers, inferOrderProductionStatus, mapCheckoutRowsToOrderLineItems, mapCheckoutSessionToOrderInput, mergeOrderDetails, normalizeOrderRecord, normalizePrePaymentShippingAddress, readSetupString } from "./order-model";
import type { AdminOrderProductionActionInput, AdminOrderProductionActionResult, CheckoutPaymentFailureStatus, FulfillmentUpdateResult, OrderLineItem, OrderRecord, OrderRefundSaveResult, OrdersDbClient, PaidOrderSaveResult, ProductionStatus, ShippingStatus, StripeCheckoutSessionLike } from "./order-types";
export { applyOrderLineItemFulfillmentInference, getOrderLineItemFulfillmentKind, getOrderLineItemProductionSummary, getOrderProductionBlockers, mapCheckoutRowsToOrderLineItems, mapCheckoutSessionToOrderInput } from "./order-model";
export type { AdminOrderProductionActionInput, AdminOrderProductionActionResult, CheckoutPaymentFailureStatus, FulfillmentUpdateResult, OrderLineItem, OrderLineItemFulfillmentKind, OrderLineItemProductionSummary, OrderRecord, OrderRefundSaveResult, OrdersDbClient, PaidOrderSaveResult, ProductionStatus, ShippingStatus, StripeCheckoutSessionLike } from "./order-types";

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

// An existing checkout owns its original setup and payment state, even on stale retries.
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

type PaidArtworkOptions = {
  storage?: ProductionArtworkStorage;
  assetResolver?: ProductionArtworkAssetResolver;
  artworkExists?: (key: string) => Promise<boolean>;
  assertActive?: StripeProcessingGuard;
};

export function getAdminOrderArtworkUrl(order: Pick<OrderRecord, "id">, lineItemIndex: number) {
  return order.id && Number.isSafeInteger(lineItemIndex) && lineItemIndex >= 0
    ? `/api/admin/orders/${encodeURIComponent(order.id)}/artwork/${lineItemIndex}`
    : undefined;
}

export function getOrderArtworkStorageKey(order: OrderRecord, lineItemIndex: number) {
  const item = order.line_items_json[lineItemIndex];
  const reference = item && readProductionArtworkReference(item);
  const key = reference?.status === "generated" ? reference.storageKey : undefined;
  if (!key || !isSafeProductMediaKey(key)) return undefined;
  const parts = key.split("/");
  const orderReferences = [order.stripe_checkout_session_id, order.id].filter((value): value is string => Boolean(value)).map(artworkKeySegment);
  return parts.length === 5 && parts[1] === artworkKeySegment(item.productId) && parts[2] === "production_artwork" &&
    orderReferences.includes(parts[3]) && new RegExp(`^line-${lineItemIndex + 1}-[a-f0-9]{16,64}\\.svg$`).test(parts[4])
    ? key : undefined;
}

function artworkKeySegment(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "item";
}

function artworkSnapshotHash(value: unknown): string {
  const sort = (entry: unknown): unknown => Array.isArray(entry) ? entry.map(sort) : entry && typeof entry === "object"
    ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sort(item)])) : entry;
  return createHash("sha256").update(JSON.stringify(sort(value))).digest("hex");
}

function hasCurrentArtworkApproval(item: OrderLineItem) {
  try {
    return item.proofApproved === true && item.setup?.designAssistanceRequested !== true &&
      isProofApprovalSnapshotCurrent(buildCurrentApprovalSnapshot(item), item.setup?.proofApprovalSnapshot);
  } catch {
    return false;
  }
}

function hasProvisionedArtworkTargets(item: OrderLineItem) {
  if (getOrderLineItemFulfillmentKind(item) !== "hosted") return true;
  const target = readSetupString(item.setup, "qrTargetUrl");
  return Boolean(readSetupString(item.setup, "hostedPageCode") && target &&
    target === readSetupString(item.setup, "generatedQrValue") && target === readSetupString(item.setup, "nfcTargetUrl"));
}

function withoutProductionArtwork(item: OrderLineItem): OrderLineItem {
  return { ...item, setup: Object.fromEntries(Object.entries(item.setup ?? {}).filter(([key]) => key !== "productionArtwork")) };
}

async function canReuseOrderArtwork(order: OrderRecord, index: number, options: PaidArtworkOptions) {
  const item = order.line_items_json[index];
  const reference = readProductionArtworkReference(item);
  const template = getProductionArtworkTemplate(item);
  const key = getOrderArtworkStorageKey(order, index);
  const approved = buildCurrentApprovalSnapshot(item);
  if (!reference || !template || !key || !hasCurrentArtworkApproval(item) ||
    reference.approvalSnapshotHash !== artworkSnapshotHash(item.setup?.proofApprovalSnapshot) ||
    !key.endsWith(`-${reference.approvalSnapshotHash.slice(0, 16)}.svg`) ||
    reference.templateId !== template.id || reference.templateVersion !== template.version ||
    reference.widthPx !== template.widthPx || reference.heightPx !== template.heightPx || reference.dpi !== template.dpi ||
    reference.widthIn !== template.widthIn || reference.heightIn !== template.heightIn ||
    (approved.baseTemplateContentHash && reference.baseTemplateContentHash !== approved.baseTemplateContentHash) ||
    (approved.logoContentHash && reference.logoContentHash !== approved.logoContentHash) ||
    !reference.baseTemplateContentHash || !reference.logoContentHash) return false;
  return options.artworkExists ? options.artworkExists(key) : Boolean(await getProductMediaObject(key));
}

function matchOrderField(query: any, field: string, value: unknown) {
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

export async function ensurePaidOrderProductionArtwork(stripeCheckoutSessionId: string, options: Pick<PaidArtworkOptions, "assertActive"> = {}) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return ensurePaidOrderProductionArtworkWithClient(getSupabaseAdmin(), stripeCheckoutSessionId, options);
}

// The caller holds the payment lease. Reload after provisioning and persist each line
// independently so a failed later line cannot discard successful artwork references.
export async function ensurePaidOrderProductionArtworkWithClient(
  client: OrdersDbClient,
  stripeCheckoutSessionId: string,
  options: PaidArtworkOptions = {}
): Promise<{ ok: true; order: OrderRecord; paymentReversed?: boolean } | { ok: false; error: string }> {
  try {
    await options.assertActive?.();
    const lookup = await client.from("orders").select("*").eq("stripe_checkout_session_id", stripeCheckoutSessionId).maybeSingle();
    if (lookup.error || !lookup.data) return { ok: false, error: lookup.error?.message ?? "Paid order was not found." };
    let order = normalizeOrderRecord(lookup.data);
    const waitingForArtwork = order.line_items_json.some((item) => item.optionId === "branded_qr_direct" && readProductionArtworkReference(item)?.status !== "generated");
    if (order.stripe_refund_id || order.refund_status || order.payment_status?.includes("refund")) return { ok: true, order, paymentReversed: true };
    if (order.status !== "paid" || !["paid", "complimentary"].includes(order.payment_status ?? "")) return { ok: false, error: "Artwork requires confirmed payment or a complimentary order." };
    if (!canRunOrderProductionActions(order)) return { ok: true, order };
    for (let index = 0; index < order.line_items_json.length; index++) {
      const item = order.line_items_json[index];
      if (item.optionId !== "branded_qr_direct") continue;
      await options.assertActive?.();
      const url = getAdminOrderArtworkUrl(order, index);
      if (!url) return { ok: false, error: "Artwork requires a persisted order identifier." };
      if (!hasCurrentArtworkApproval(item)) return { ok: false, error: `Line ${index + 1} requires approval of the current artwork.` };
      if (!hasProvisionedArtworkTargets(item)) {
        return { ok: false, error: "Hosted artwork requires the approved permanent QR and NFC destination." };
      }
      const reusable = await canReuseOrderArtwork(order, index, options);
      const generated = reusable ? item : await generateProductionArtworkForOrderLineItem({
        orderReference: order.stripe_checkout_session_id, lineItemIndex: index, item: withoutProductionArtwork(item), assetResolver: options.assetResolver
      }, options.storage);
      const reference = readProductionArtworkReference(generated);
      const lineItems = order.line_items_json.slice();
      lineItems[index] = applyOrderLineItemFulfillmentInference({ ...generated, setup: {
        ...generated.setup, ...(reference ? { productionArtwork: { ...reference, url: reference.status === "generated" ? url : undefined } } : {})
      } });
      const generatedKey = getOrderArtworkStorageKey({ ...order, line_items_json: lineItems }, index);
      const failed = reference?.status !== "generated" || !generatedKey;
      if (!reusable || reference?.url !== url) {
        await options.assertActive?.();
        const payload = { line_items_json: lineItems, ...(failed ? { production_status: "blocked" } : {}), updated_at: new Date().toISOString() };
        const saved = await guardedOrderUpdate(client, order, payload).select("*").maybeSingle();
        if (saved.error || !saved.data) return { ok: false, error: saved.error?.message ?? "Order changed during artwork generation. Retry the event." };
        order = normalizeOrderRecord(saved.data);
      }
      if (failed) return { ok: false, error: reference?.error ?? `Line ${index + 1} production artwork could not be generated.` };
    }
    await options.assertActive?.();
    if (waitingForArtwork && ["blocked", "not_started"].includes(order.production_status) &&
      order.shipping_status !== "blocked" && getOrderProductionBlockers(order).length === 0) {
      const saved = await guardedOrderUpdate(client, order, { production_status: "ready_for_production" }).select("*").maybeSingle();
      if (saved.error || !saved.data) return { ok: false, error: saved.error?.message ?? "Order changed during artwork recovery. Retry the event." };
      order = normalizeOrderRecord(saved.data);
    }
    return { ok: true, order };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Production artwork could not be completed." };
  }
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
