import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { CheckoutCartRow, ManualProductionWarningCode } from "@/lib/checkout";

export type OrdersDbClient = {
  from: (table: string) => any;
};

export type OrderLineItem = {
  productId: string;
  optionId?: string;
  optionLabel?: string;
  title: string;
  sku: string;
  quantity: number;
  unitAmountCents: number;
  lineSubtotalCents: number;
  setup?: Record<string, unknown>;
  logoRequired?: boolean;
  logoStatus?: "not_required" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired?: boolean;
  proofApproved?: boolean;
  productionStatus?: "ready_for_direct_activation" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof";
  manualProductionRequired?: boolean;
  productionWarningCodes?: ManualProductionWarningCode[];
};

export type OrderLineItemFulfillmentKind = "standard" | "branded" | "custom";

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
  created_at?: string;
  updated_at?: string;
};

export type StripeCheckoutSessionLike = {
  id?: string | null;
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
  metadata?: Record<string, string | null> | null;
};

export function mapCheckoutRowsToOrderLineItems(rows: CheckoutCartRow[]): OrderLineItem[] {
  return rows.map((row) =>
    applyOrderLineItemFulfillmentInference({
      productId: row.productId,
      optionId: row.optionId,
      optionLabel: row.optionLabel,
      title: row.title,
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

export function applyOrderLineItemFulfillmentInference(item: OrderLineItem): OrderLineItem {
  const fulfillmentKind = getOrderLineItemFulfillmentKind(item);

  if (fulfillmentKind === "standard") {
    return {
      ...item,
      logoRequired: item.logoRequired === true,
      logoStatus: item.logoRequired ? item.logoStatus ?? "manual_collection_required" : "not_required",
      logoReference: item.logoReference ?? null,
      proofRequired: item.proofRequired === true,
      proofApproved: item.proofApproved === true,
      productionStatus: item.productionStatus ?? "ready_for_direct_activation",
      manualProductionRequired: item.manualProductionRequired === true,
      productionWarningCodes: normalizeProductionWarningCodes(item.productionWarningCodes)
    };
  }

  const productionStatus =
    fulfillmentKind === "custom" ? "pending_manual_design_and_proof" : "pending_manual_logo_and_proof";

  return {
    ...item,
    logoRequired: true,
    logoStatus: item.logoReference ? item.logoStatus ?? "manual_collection_required" : "manual_collection_required",
    logoReference: item.logoReference ?? null,
    proofRequired: true,
    proofApproved: item.proofApproved === true,
    productionStatus,
    manualProductionRequired: true,
    productionWarningCodes: normalizeProductionWarningCodes(item.productionWarningCodes, [
      "pending_manual_proof",
      "asset_storage_not_configured",
      "do_not_print_until_manual_review"
    ])
  };
}

export function getOrderLineItemFulfillmentKind(item: OrderLineItem): OrderLineItemFulfillmentKind {
  const optionId = item.optionId?.toLowerCase() ?? "";
  const optionLabel = item.optionLabel?.toLowerCase() ?? "";
  const productionStatus = item.productionStatus?.toLowerCase() ?? "";
  const warningCodes = Array.isArray(item.productionWarningCodes) ? item.productionWarningCodes : [];

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
    productionStatus === "pending_manual_logo_and_proof"
  ) {
    return "branded";
  }

  if (item.manualProductionRequired || warningCodes.includes("pending_manual_proof")) {
    return "branded";
  }

  return "standard";
}

export function mapCheckoutSessionToOrderInput(session: StripeCheckoutSessionLike): OrderRecord {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const lineItems = parseOrderLineItems(session.metadata?.order_items);

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
    updated_at: new Date().toISOString()
  };
}

export async function createPendingOrderForCheckout({
  stripeCheckoutSessionId,
  rows,
  subtotalCents,
  totalCents,
  currency
}: {
  stripeCheckoutSessionId: string;
  rows: CheckoutCartRow[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured. Checkout is disabled until order persistence is ready." };
  }

  return createPendingOrderForCheckoutWithClient(getSupabaseAdmin() as OrdersDbClient, {
    stripeCheckoutSessionId,
    rows,
    subtotalCents,
    totalCents,
    currency
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
  }
) {
  const { error } = await client.from("orders").upsert(
    {
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      status: "pending_payment",
      payment_status: "unpaid",
      subtotal_cents: input.subtotalCents,
      total_cents: input.totalCents,
      currency: input.currency,
      line_items_json: mapCheckoutRowsToOrderLineItems(input.rows),
      updated_at: new Date().toISOString()
    },
    { onConflict: "stripe_checkout_session_id" }
  );

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function savePaidOrderFromCheckoutSession(session: StripeCheckoutSessionLike) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Database persistence is not configured." };
  }

  return savePaidOrderFromCheckoutSessionWithClient(getSupabaseAdmin() as OrdersDbClient, session);
}

export async function savePaidOrderFromCheckoutSessionWithClient(client: OrdersDbClient, session: StripeCheckoutSessionLike) {
  const order = mapCheckoutSessionToOrderInput(session);

  if (!order.stripe_checkout_session_id) {
    return { ok: false, error: "Missing Stripe Checkout Session ID." };
  }

  const payload: Record<string, unknown> = { ...order };
  if (order.line_items_json.length === 0) {
    delete payload.line_items_json;
  }

  const { error } = await client.from("orders").upsert(payload, { onConflict: "stripe_checkout_session_id" });

  return error ? { ok: false, error: error.message } : { ok: true };
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
  return value === "pending_manual_proof" || value === "asset_storage_not_configured" || value === "do_not_print_until_manual_review";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOrderStatus(value: unknown): OrderRecord["status"] | undefined {
  return value === "pending_payment" || value === "paid" || value === "failed" || value === "canceled" ? value : undefined;
}
