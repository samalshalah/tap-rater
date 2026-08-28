import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { CheckoutCartRow, ManualProductionWarningCode } from "@/lib/checkout";
import { buildDirectProductionTargets } from "@/lib/direct-production";
import { purchaseOptionIdToCustomizationLevel, type CustomizationLevel, type DestinationMode } from "@/lib/product-model";
import { sendShippingNotificationEmail, type ShippingEmailInput } from "@/lib/shipping-emails";
import {
  generateProductionArtworkForOrderLineItem,
  readProductionArtworkReference,
  type ProductionArtworkAssetResolver,
  type ProductionArtworkReference,
  type ProductionArtworkStorage
} from "@/lib/production-artwork";
import type { OrderFulfillmentUpdateInput } from "@/lib/validators";

export type OrdersDbClient = {
  from: (table: string) => any;
};

export type OrderLineItem = {
  productId: string;
  optionId?: string;
  optionLabel?: string;
  destinationMode?: DestinationMode;
  customizationLevel?: CustomizationLevel;
  title: string;
  baseSku?: string;
  sku: string;
  quantity: number;
  unitAmountCents: number;
  lineSubtotalCents: number;
  setup?: Record<string, unknown>;
  logoRequired?: boolean;
  logoStatus?: "not_required" | "uploaded" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired?: boolean;
  proofApproved?: boolean;
  productionStatus?: "ready_for_direct_fulfillment" | "ready_for_direct_activation" | "pending_branded_proof_review" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof" | "artwork_generation_failed";
  manualProductionRequired?: boolean;
  productionWarningCodes?: ManualProductionWarningCode[];
};

export type OrderLineItemFulfillmentKind = "standard" | "branded" | "custom" | "hosted";

export type OrderLineItemProductionSummary = {
  fulfillmentKind: OrderLineItemFulfillmentKind;
  optionLabel: string;
  nfcBehavior: "DIRECT NFC" | "HOSTED NFC";
  printedQrLabel: "DIRECT QR" | "HOSTED QR";
  destinationUrl?: string;
  destinationType?: string;
  platformSlug?: string;
  businessName?: string;
  logoMediaUrl?: string;
  logoReference?: string;
  generatedQrValue?: string;
  qrTargetUrl?: string;
  nfcTargetUrl?: string;
  frontTemplateUrl?: string;
  centerAssetUrl?: string;
  ctaText?: string;
  productionArtwork?: ProductionArtworkReference;
  proofRequired: boolean;
  proofConfirmed: boolean;
  statusLabel: string;
  statusTone: "ready" | "warning" | "neutral";
  warnings: string[];
};

export type ProductionStatus = "not_started" | "ready_for_production" | "in_production" | "blocked" | "completed";
export type ShippingStatus = "not_shipped" | "ready_to_ship" | "shipped" | "delivered" | "blocked";

export type OrderRecord = {
  id?: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id?: string | null;
  status: "pending_payment" | "paid" | "failed" | "canceled";
  payment_status?: string | null;
  email?: string | null;
  customer_name?: string | null;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  line_items_json: OrderLineItem[];
  customer_details_json?: Record<string, unknown> | null;
  shipping_address_json?: Record<string, unknown> | null;
  shipping_amount_cents: number;
  shipping_mode?: "manual" | "free" | "flat" | null;
  production_status: ProductionStatus;
  shipping_status: ShippingStatus;
  shipping_method?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  internal_notes: string;
  admin_fulfillment_notes: string;
  created_at?: string;
  updated_at?: string;
};

export type PaidOrderSaveResult =
  | {
      ok: true;
      order: OrderRecord;
      wasAlreadyPaid: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type FulfillmentUpdateResult =
  | {
      ok: true;
      shippingEmail?: Awaited<ReturnType<typeof sendShippingNotificationEmail>>;
    }
  | {
      ok: false;
      error: string;
    };

export type StripeCheckoutSessionLike = {
  id?: string | null;
  mode?: string | null;
  customer?: string | { id?: string | null } | null;
  subscription?: string | { id?: string | null; status?: string | null; current_period_end?: number | null; cancel_at_period_end?: boolean | null } | null;
  payment_intent?: string | { id?: string | null } | null;
  payment_status?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    address?: unknown;
  } | null;
  shipping_details?: {
    name?: string | null;
    phone?: string | null;
    address?: unknown;
  } | null;
  shipping_cost?: {
    amount_total?: number | null;
  } | null;
  collected_information?: {
    shipping_details?: {
      name?: string | null;
      phone?: string | null;
      address?: unknown;
    } | null;
  } | null;
  metadata?: Record<string, string | null> | null;
};

export function mapCheckoutRowsToOrderLineItems(rows: CheckoutCartRow[]): OrderLineItem[] {
  return rows.map((row) =>
    applyOrderLineItemFulfillmentInference({
      productId: row.productId,
      optionId: row.optionId,
      optionLabel: row.optionLabel,
      destinationMode: row.destinationMode,
      customizationLevel: row.customizationLevel,
      title: row.title,
      baseSku: row.baseSku,
      sku: row.sku,
      quantity: row.quantity,
      unitAmountCents: row.unitAmountCents,
      lineSubtotalCents: row.lineSubtotalCents,
      setup: row.setup,
      logoRequired: row.logoRequired,
      logoStatus: row.logoStatus,
      logoReference: row.logoReference ?? null,
      proofRequired: row.proofRequired,
      proofApproved: row.proofApproved,
      productionStatus: row.productionStatus,
      manualProductionRequired: row.manualProductionRequired,
      productionWarningCodes: row.productionWarningCodes
    })
  );
}

export async function mapCheckoutRowsToProductionReadyOrderLineItems(
  rows: CheckoutCartRow[],
  orderReference: string,
  storage?: ProductionArtworkStorage,
  assetResolver?: ProductionArtworkAssetResolver
): Promise<OrderLineItem[]> {
  const items = mapCheckoutRowsToOrderLineItems(rows);

  return Promise.all(
    items.map((item, index) =>
      item.optionId === "branded_qr_direct"
        ? generateProductionArtworkForOrderLineItem({ orderReference, lineItemIndex: index, item, assetResolver }, storage)
        : item
    )
  );
}

export function applyOrderLineItemFulfillmentInference(item: OrderLineItem): OrderLineItem {
  const fulfillmentKind = getOrderLineItemFulfillmentKind(item);

  if (fulfillmentKind === "standard") {
    return {
      ...item,
      destinationMode: item.destinationMode ?? "DIRECT",
      customizationLevel: item.customizationLevel ?? purchaseOptionIdToCustomizationLevel(item.optionId),
      logoRequired: item.logoRequired === true,
      logoStatus: item.logoRequired ? item.logoStatus ?? "manual_collection_required" : "not_required",
      logoReference: item.logoReference ?? null,
      proofRequired: item.proofRequired === true,
      proofApproved: item.proofApproved === true,
      productionStatus: item.productionStatus === "ready_for_direct_activation" ? "ready_for_direct_fulfillment" : item.productionStatus ?? "ready_for_direct_fulfillment",
      manualProductionRequired: item.manualProductionRequired === true,
      productionWarningCodes: normalizeProductionWarningCodes(item.productionWarningCodes)
    };
  }

  if (fulfillmentKind === "hosted") {
    const setup = item.setup && typeof item.setup === "object" ? item.setup : {};
    const hostedPageCode = readSetupString(setup, "hostedPageCode") ?? readSetupString(setup, "permanentPageCode");
    const qrTargetUrl = readSetupString(setup, "qrTargetUrl") ?? readSetupString(setup, "generatedQrValue");
    const nfcTargetUrl = readSetupString(setup, "nfcTargetUrl");
    const isProvisioned = Boolean(hostedPageCode && qrTargetUrl && nfcTargetUrl);

    return {
      ...item,
      destinationMode: "HOSTED",
      customizationLevel: item.customizationLevel ?? "BRANDED",
      logoRequired: true,
      logoStatus: item.logoReference ? item.logoStatus ?? "uploaded" : item.logoStatus ?? "manual_collection_required",
      logoReference: item.logoReference ?? null,
      proofRequired: true,
      proofApproved: item.proofApproved === true,
      productionStatus: isProvisioned ? item.productionStatus ?? "ready_for_direct_fulfillment" : item.productionStatus ?? "pending_manual_design_and_proof",
      manualProductionRequired: !isProvisioned,
      productionWarningCodes: isProvisioned
        ? normalizeProductionWarningCodes(item.productionWarningCodes)
        : normalizeProductionWarningCodes(item.productionWarningCodes, ["pending_manual_proof", "do_not_print_until_manual_review"])
    };
  }

  const hasLogoReference = Boolean(item.logoReference);
  const productionArtwork = readProductionArtworkReference(item);
  const isProductionReadyBranded = fulfillmentKind === "branded" && hasLogoReference && item.proofApproved === true && productionArtwork?.status === "generated";
  const hasArtworkFailure = productionArtwork?.status === "generation_failed" || item.productionStatus === "artwork_generation_failed";
  const productionStatus =
    fulfillmentKind === "custom" ? "pending_manual_design_and_proof" : "pending_manual_logo_and_proof";

  return {
    ...item,
    destinationMode: item.destinationMode ?? "DIRECT",
    customizationLevel: item.customizationLevel ?? purchaseOptionIdToCustomizationLevel(item.optionId),
    logoRequired: true,
    logoStatus: hasLogoReference ? item.logoStatus ?? "uploaded" : "manual_collection_required",
    logoReference: item.logoReference ?? null,
    proofRequired: true,
    proofApproved: item.proofApproved === true,
    productionStatus: hasArtworkFailure
      ? "artwork_generation_failed"
      : isProductionReadyBranded
      ? "ready_for_direct_fulfillment"
      : hasLogoReference && fulfillmentKind === "branded"
        ? item.productionStatus ?? "pending_branded_proof_review"
        : productionStatus,
    manualProductionRequired: !isProductionReadyBranded,
    productionWarningCodes: hasArtworkFailure
      ? normalizeProductionWarningCodes(item.productionWarningCodes, ["artwork_generation_failed", "do_not_print_until_manual_review"])
      : isProductionReadyBranded
      ? []
      : normalizeProductionWarningCodes(
          item.productionWarningCodes,
          hasLogoReference && fulfillmentKind === "branded"
            ? ["pending_manual_proof", "do_not_print_until_manual_review"]
            : ["pending_manual_proof", "asset_storage_not_configured", "do_not_print_until_manual_review"]
        )
  };
}

export function getOrderLineItemFulfillmentKind(item: OrderLineItem): OrderLineItemFulfillmentKind {
  const optionId = item.optionId?.toLowerCase() ?? "";
  const optionLabel = item.optionLabel?.toLowerCase() ?? "";
  const productionStatus = item.productionStatus?.toLowerCase() ?? "";
  const warningCodes = Array.isArray(item.productionWarningCodes) ? item.productionWarningCodes : [];

  if (optionId === "hosted_multilink" || optionLabel.includes("hosted multi-link")) {
    return "hosted";
  }

  if (
    optionId === "custom_direct" ||
    optionLabel.includes("custom direct") ||
    productionStatus === "pending_manual_design_and_proof"
  ) {
    return "custom";
  }

  if (
    optionId === "branded_qr_direct" ||
    optionLabel.includes("branded + qr") ||
    productionStatus === "pending_branded_proof_review" ||
    productionStatus === "pending_manual_logo_and_proof"
  ) {
    return "branded";
  }

  if (item.manualProductionRequired || warningCodes.includes("pending_manual_proof")) {
    return "branded";
  }

  return "standard";
}

export function getOrderLineItemProductionSummary(item: OrderLineItem): OrderLineItemProductionSummary {
  const fulfillmentKind = getOrderLineItemFulfillmentKind(item);
  const destinationUrl = readSetupString(item.setup, "destinationUrl");
  const destinationType = readSetupString(item.setup, "destinationType");
  const platformSlug = readSetupString(item.setup, "platformSlug");
  const businessName = readSetupString(item.setup, "businessName");
  const logoMediaUrl = readSetupString(item.setup, "logoMediaUrl");
  const logoReference = item.logoReference ?? readSetupString(item.setup, "logoStorageKey") ?? logoMediaUrl;
  const directTargets = buildDirectProductionTargets(destinationUrl);
  const generatedQrValue = readSetupString(item.setup, "generatedQrValue") ?? directTargets?.qrTargetUrl;
  const qrTargetUrl = readSetupString(item.setup, "qrTargetUrl") ?? generatedQrValue ?? directTargets?.qrTargetUrl;
  const nfcTargetUrl = readSetupString(item.setup, "nfcTargetUrl") ?? directTargets?.nfcTargetUrl;
  const frontTemplateUrl = readSetupString(item.setup, "frontTemplateUrl") ?? readProofPreviewString(item.setup, "frontTemplateUrl");
  const centerAssetUrl = readSetupString(item.setup, "centerAssetUrl") ?? readProofPreviewString(item.setup, "centerAssetUrl");
  const ctaText = readSetupString(item.setup, "ctaText") ?? readSetupString(item.setup, "cta") ?? readProofPreviewString(item.setup, "ctaText");
  const productionArtwork = readProductionArtworkReference(item);

  if (fulfillmentKind === "standard") {
    return {
      fulfillmentKind,
      optionLabel: "Standard Direct",
      nfcBehavior: "DIRECT NFC",
      printedQrLabel: "DIRECT QR",
      destinationUrl,
      destinationType,
      platformSlug,
      generatedQrValue,
      qrTargetUrl,
      nfcTargetUrl,
      productionArtwork,
      proofRequired: false,
      proofConfirmed: false,
      statusLabel: "Ready for direct fulfillment",
      statusTone: "ready",
      warnings: []
    };
  }

  if (fulfillmentKind === "hosted") {
    const hostedWarnings: string[] = [];
    if (!qrTargetUrl) hostedWarnings.push("Missing hosted QR target URL");
    if (!nfcTargetUrl) hostedWarnings.push("Missing hosted NFC target URL");
    if (!readSetupString(item.setup, "hostedPageCode") && !readSetupString(item.setup, "permanentPageCode")) hostedWarnings.push("Missing permanent hosted page code");

    return {
      fulfillmentKind,
      optionLabel: "Hosted Multi-Link",
      nfcBehavior: "HOSTED NFC",
      printedQrLabel: "HOSTED QR",
      destinationUrl,
      destinationType,
      platformSlug,
      businessName,
      logoMediaUrl,
      logoReference: logoReference ?? undefined,
      generatedQrValue,
      qrTargetUrl,
      nfcTargetUrl,
      frontTemplateUrl,
      productionArtwork,
      proofRequired: true,
      proofConfirmed: item.proofApproved === true,
      statusLabel: hostedWarnings.length === 0 ? "Ready for hosted production" : "Hosted setup pending",
      statusTone: hostedWarnings.length === 0 ? "ready" : "warning",
      warnings: hostedWarnings
    };
  }

  const warnings: string[] = [];
  const proofConfirmed = item.proofApproved === true;

  if (!destinationUrl) warnings.push("Missing destination URL");
  if (!businessName) warnings.push(fulfillmentKind === "custom" ? "Missing business name/design name" : "Missing business name");
  if (!logoReference) warnings.push(fulfillmentKind === "custom" ? "Missing logo or design asset" : "Missing logo");
  if (fulfillmentKind === "branded" && !generatedQrValue) warnings.push("Missing QR value");
  if (fulfillmentKind === "branded" && !qrTargetUrl) warnings.push("Missing QR target URL");
  if (fulfillmentKind === "branded" && !nfcTargetUrl) warnings.push("Missing NFC target URL");
  if (fulfillmentKind === "branded" && !frontTemplateUrl) warnings.push("Missing branded front template");
  if (!proofConfirmed) warnings.push("Proof not confirmed");
  if (fulfillmentKind === "branded" && productionArtwork?.status !== "generated") warnings.push(productionArtwork?.error ?? "Production artwork not generated");

  const isComplete = warnings.length === 0;

  return {
    fulfillmentKind,
    optionLabel: fulfillmentKind === "custom" ? "Custom Direct" : "Branded + QR Direct",
    nfcBehavior: "DIRECT NFC",
    printedQrLabel: "DIRECT QR",
    destinationUrl,
    destinationType,
    platformSlug,
    businessName,
    logoMediaUrl,
    logoReference: logoReference ?? undefined,
    generatedQrValue,
    qrTargetUrl,
    nfcTargetUrl,
    frontTemplateUrl,
    centerAssetUrl,
    ctaText,
    productionArtwork,
    proofRequired: true,
    proofConfirmed,
    statusLabel: isComplete
      ? fulfillmentKind === "custom"
        ? "Ready for custom production review"
        : "Ready for production review"
      : "Needs setup review",
    statusTone: isComplete ? "ready" : "warning",
    warnings
  };
}

export function mapCheckoutSessionToOrderInput(session: StripeCheckoutSessionLike): OrderRecord {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const lineItems = parseOrderLineItems(session.metadata?.order_items);
  const shippingDetails = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const shippingAddress = normalizeShippingAddress(shippingDetails, session.customer_details);

  return {
    stripe_checkout_session_id: session.id ?? "",
    stripe_payment_intent_id: paymentIntent,
    status: session.payment_status === "paid" ? "paid" : "pending_payment",
    payment_status: session.payment_status ?? null,
    email,
    customer_name: session.customer_details?.name ?? null,
    subtotal_cents: session.amount_subtotal ?? 0,
    total_cents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    line_items_json: lineItems,
    customer_details_json: session.customer_details ? { ...session.customer_details } : null,
    shipping_address_json: shippingAddress,
    shipping_amount_cents: session.shipping_cost?.amount_total ?? readIntegerString(session.metadata?.shipping_amount_cents) ?? 0,
    shipping_mode: readShippingMode(session.metadata?.shipping_mode) ?? null,
    production_status: "not_started",
    shipping_status: "not_shipped",
    shipping_method: null,
    shipping_carrier: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    internal_notes: "",
    admin_fulfillment_notes: "",
    updated_at: new Date().toISOString()
  };
}

export async function createPendingOrderForCheckout({
  stripeCheckoutSessionId,
  rows,
  subtotalCents,
  totalCents,
  currency,
  shippingAmountCents = 0,
  shippingMode = "manual"
}: {
  stripeCheckoutSessionId: string;
  rows: CheckoutCartRow[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
  shippingAmountCents?: number;
  shippingMode?: "manual" | "free" | "flat";
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
    shippingAmountCents,
    shippingMode
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
    shippingAmountCents?: number;
    shippingMode?: "manual" | "free" | "flat";
  }
) {
  const lineItems = await mapCheckoutRowsToProductionReadyOrderLineItems(input.rows, input.stripeCheckoutSessionId);
  const { error } = await client.from("orders").upsert(
    {
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      status: "pending_payment",
      payment_status: "unpaid",
      subtotal_cents: input.subtotalCents,
      total_cents: input.totalCents,
      currency: input.currency,
      line_items_json: lineItems,
      shipping_amount_cents: input.shippingAmountCents ?? 0,
      shipping_mode: input.shippingMode ?? "manual",
      updated_at: new Date().toISOString()
    },
    { onConflict: "stripe_checkout_session_id" }
  );

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function savePaidOrderFromCheckoutSession(session: StripeCheckoutSessionLike): Promise<PaidOrderSaveResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured." };
  }

  return savePaidOrderFromCheckoutSessionWithClient(getSupabaseAdmin() as OrdersDbClient, session);
}

export async function savePaidOrderFromCheckoutSessionWithClient(
  client: OrdersDbClient,
  session: StripeCheckoutSessionLike
): Promise<PaidOrderSaveResult> {
  const order = mapCheckoutSessionToOrderInput(session);

  if (!order.stripe_checkout_session_id) {
    return { ok: false, error: "Missing Stripe Checkout Session ID." };
  }

  const existingOrder = await getOrderByStripeCheckoutSessionId(client, order.stripe_checkout_session_id);
  const wasAlreadyPaid = existingOrder?.status === "paid" || existingOrder?.payment_status === "paid";
  const mergedOrder: OrderRecord = {
    ...existingOrder,
    ...order,
    line_items_json: order.line_items_json.length > 0 ? order.line_items_json : existingOrder?.line_items_json ?? []
  };

  const payload: Record<string, unknown> = { ...order };
  if (mergedOrder.line_items_json.length > 0 && order.line_items_json.length === 0) {
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
    payload.shipping_address_json = order.shipping_address_json ?? existingOrder.shipping_address_json ?? null;
    payload.shipping_amount_cents = order.shipping_amount_cents || existingOrder.shipping_amount_cents;
    payload.shipping_mode = order.shipping_mode ?? existingOrder.shipping_mode ?? null;
  }

  const { error } = await client.from("orders").upsert(payload, { onConflict: "stripe_checkout_session_id" });

  return error ? { ok: false, error: error.message } : { ok: true, order: mergedOrder, wasAlreadyPaid };
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

export async function updateOrderFulfillment(orderId: string, input: OrderFulfillmentUpdateInput): Promise<FulfillmentUpdateResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured." };
  }

  return updateOrderFulfillmentWithClient(getSupabaseAdmin() as OrdersDbClient, orderId, input);
}

export async function updateOrderFulfillmentWithClient(
  client: OrdersDbClient,
  orderId: string,
  input: OrderFulfillmentUpdateInput,
  options: {
    sendShippingNotificationEmailFn?: (input: ShippingEmailInput) => ReturnType<typeof sendShippingNotificationEmail>;
  } = {}
): Promise<FulfillmentUpdateResult> {
  const now = new Date().toISOString();
  const shippingStatus = input.markShipped ? "shipped" : input.shippingStatus;
  const existingOrder = await getOrderByIdForFulfillment(client, orderId);
  const shouldSendShippingEmail =
    Boolean(input.markShipped) &&
    existingOrder?.shipping_status !== "shipped" &&
    existingOrder?.shipping_status !== "delivered" &&
    Boolean(existingOrder?.email) &&
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

  if (input.markShipped) {
    payload.shipped_at = now;
  }

  const { error } = await client.from("orders").update(payload).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  if (!shouldSendShippingEmail || !existingOrder) {
    return { ok: true };
  }

  const shippingEmail = await (options.sendShippingNotificationEmailFn ?? sendShippingNotificationEmail)({
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
      shipped_at: input.markShipped ? now : existingOrder.shipped_at,
      updated_at: now
    }
  });

  if (!shippingEmail.sent) {
    console.warn("[orders] shipping_email_not_sent", {
      orderId,
      reason: shippingEmail.reason
    });
  }

  return { ok: true, shippingEmail };
}

function parseOrderLineItems(value: string | null | undefined): OrderLineItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const row = item as Partial<OrderLineItem>;
          return typeof row.productId === "string" &&
            typeof row.title === "string" &&
            typeof row.sku === "string" &&
            Number.isInteger(row.quantity) &&
            Number.isInteger(row.unitAmountCents) &&
            Number.isInteger(row.lineSubtotalCents)
            ? [
                applyOrderLineItemFulfillmentInference({
                  ...row,
                  setup: row.setup && typeof row.setup === "object" ? row.setup : undefined
                } as OrderLineItem)
              ]
            : [];
        })
      : [];
  } catch {
    return [];
  }
}

function normalizeOrderRecord(value: unknown): OrderRecord {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: readString(row.id),
    stripe_checkout_session_id: readString(row.stripe_checkout_session_id) ?? "",
    stripe_payment_intent_id: readString(row.stripe_payment_intent_id) ?? null,
    status: readOrderStatus(row.status) ?? "pending_payment",
    payment_status: readString(row.payment_status) ?? null,
    email: readString(row.email) ?? null,
    customer_name: readString(row.customer_name) ?? null,
    subtotal_cents: readNumber(row.subtotal_cents) ?? 0,
    total_cents: readNumber(row.total_cents) ?? 0,
    currency: readString(row.currency) ?? "usd",
    line_items_json: Array.isArray(row.line_items_json)
      ? (row.line_items_json as OrderLineItem[]).map(applyOrderLineItemFulfillmentInference)
      : [],
    customer_details_json: row.customer_details_json && typeof row.customer_details_json === "object" ? (row.customer_details_json as Record<string, unknown>) : null,
    shipping_address_json: row.shipping_address_json && typeof row.shipping_address_json === "object" ? (row.shipping_address_json as Record<string, unknown>) : null,
    shipping_amount_cents: readNumber(row.shipping_amount_cents) ?? 0,
    shipping_mode: readShippingMode(row.shipping_mode) ?? null,
    production_status: readProductionStatus(row.production_status) ?? "not_started",
    shipping_status: readShippingStatus(row.shipping_status) ?? "not_shipped",
    shipping_method: readString(row.shipping_method) ?? null,
    shipping_carrier: readString(row.shipping_carrier) ?? null,
    tracking_number: readString(row.tracking_number) ?? null,
    tracking_url: readString(row.tracking_url) ?? null,
    shipped_at: readString(row.shipped_at) ?? null,
    internal_notes: readString(row.internal_notes) ?? "",
    admin_fulfillment_notes: readString(row.admin_fulfillment_notes) ?? "",
    created_at: readString(row.created_at),
    updated_at: readString(row.updated_at)
  };
}

function normalizeProductionWarningCodes(
  current: ManualProductionWarningCode[] | undefined,
  required: ManualProductionWarningCode[] = []
): ManualProductionWarningCode[] {
  const currentCodes = Array.isArray(current) ? current.filter(isManualProductionWarningCode) : [];
  return Array.from(new Set([...currentCodes, ...required]));
}

function isManualProductionWarningCode(value: unknown): value is ManualProductionWarningCode {
  return (
    value === "pending_manual_proof" ||
    value === "asset_storage_not_configured" ||
    value === "artwork_generation_failed" ||
    value === "do_not_print_until_manual_review"
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
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

function readSetupString(setup: Record<string, unknown> | undefined, key: string) {
  if (!setup || typeof setup !== "object") {
    return undefined;
  }

  return readString(setup[key]);
}

function readProofPreviewString(setup: Record<string, unknown> | undefined, key: string) {
  const proofPreviewData = setup?.proofPreviewData;
  if (!proofPreviewData || typeof proofPreviewData !== "object") {
    return undefined;
  }

  return readString((proofPreviewData as Record<string, unknown>)[key]);
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readIntegerString(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return undefined;
  }

  return Number(value);
}

function readOrderStatus(value: unknown): OrderRecord["status"] | undefined {
  return value === "pending_payment" || value === "paid" || value === "failed" || value === "canceled" ? value : undefined;
}

function readProductionStatus(value: unknown): ProductionStatus | undefined {
  return value === "not_started" || value === "ready_for_production" || value === "in_production" || value === "blocked" || value === "completed"
    ? value
    : undefined;
}

function readShippingStatus(value: unknown): ShippingStatus | undefined {
  return value === "not_shipped" || value === "ready_to_ship" || value === "shipped" || value === "delivered" || value === "blocked" ? value : undefined;
}

function readShippingMode(value: unknown): "manual" | "free" | "flat" | undefined {
  return value === "manual" || value === "free" || value === "flat" ? value : undefined;
}

function normalizeShippingAddress(
  shippingDetails: StripeCheckoutSessionLike["shipping_details"],
  customerDetails: StripeCheckoutSessionLike["customer_details"]
): Record<string, unknown> | null {
  const address = shippingDetails?.address ?? customerDetails?.address;
  if (!address || typeof address !== "object") {
    return null;
  }

  return {
    name: shippingDetails?.name ?? customerDetails?.name ?? null,
    phone: shippingDetails?.phone ?? customerDetails?.phone ?? null,
    address
  };
}
