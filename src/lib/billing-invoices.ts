import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { OrderLineItem, OrdersDbClient, OrderRecord, StripeCheckoutSessionLike } from "@/lib/orders";

export type BillingInvoiceRecord = {
  customer_id?: string | null;
  order_id?: string | null;
  hosted_subscription_id?: string | null;
  email: string;
  stripe_customer_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_payment_intent_id?: string | null;
  invoice_number?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_method_label?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf_url?: string | null;
  receipt_url?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  currency: string;
  issued_at?: string | null;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  metadata_json?: Record<string, unknown>;
};

export type BillingInvoiceItemRecord = {
  billing_invoice_id: string;
  order_id?: string | null;
  hosted_subscription_id?: string | null;
  line_item_index: number;
  title: string;
  option_label?: string | null;
  quantity: number;
  amount_cents: number;
  recurring_amount_cents: number;
  hosted_page_url?: string | null;
  metadata_json?: Record<string, unknown>;
};

export type StripeInvoiceLike = {
  id?: string | null;
  number?: string | null;
  status?: string | null;
  paid?: boolean | null;
  customer?: string | { id?: string | null; email?: string | null } | null;
  customer_email?: string | null;
  customer_name?: string | null;
  subscription?: string | { id?: string | null } | null;
  payment_intent?: string | { id?: string | null } | null;
  checkout_session?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  receipt_url?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total_tax_amounts?: Array<{ amount?: number | null }> | null;
  shipping_cost?: { amount_total?: number | null } | null;
  total?: number | null;
  amount_paid?: number | null;
  currency?: string | null;
  created?: number | null;
  status_transitions?: { paid_at?: number | null } | null;
  period_start?: number | null;
  period_end?: number | null;
  metadata?: Record<string, string | null> | null;
};

export async function recordBillingInvoiceFromCheckoutSession(order: OrderRecord, session: StripeCheckoutSessionLike) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return recordBillingInvoiceFromCheckoutSessionWithClient(getSupabaseAdmin() as OrdersDbClient, order, session);
}

export async function recordBillingInvoiceFromCheckoutSessionWithClient(
  client: OrdersDbClient,
  order: OrderRecord,
  session: StripeCheckoutSessionLike
) {
  const details = readRecord(order.customer_details_json);
  const invoice = readRecord(session.invoice);
  const invoiceId = readString(invoice.id);
  const email = order.email?.trim().toLowerCase();
  if (!email || !invoiceId) return { ok: true as const, skipped: true as const };

  const hostedSubscriptions = order.id ? await findHostedSubscriptionsByOrderId(client, order.id) : [];
  const hostedSubscription = hostedSubscriptions[0] ?? null;
  const customerId = hostedSubscription?.customer_id ?? await findCustomerIdByEmail(client, email);
  const record: BillingInvoiceRecord = {
    customer_id: customerId,
    order_id: order.id ?? null,
    hosted_subscription_id: hostedSubscription?.id ?? null,
    email,
    stripe_customer_id: readString(details.stripe_customer_id) ?? readStripeId(session.customer),
    stripe_invoice_id: invoiceId,
    stripe_checkout_session_id: order.stripe_checkout_session_id,
    stripe_subscription_id: readStripeId(session.subscription) ?? hostedSubscription?.stripe_subscription_id ?? null,
    stripe_payment_intent_id: order.stripe_payment_intent_id ?? null,
    invoice_number: readString(invoice.number) ?? readString(details.invoice_number),
    status: "paid",
    payment_status: order.payment_status ?? order.status,
    payment_method_label: readPaymentMethodLabel(details),
    hosted_invoice_url: readString(invoice.hosted_invoice_url) ?? readString(details.hosted_invoice_url),
    invoice_pdf_url: readString(invoice.invoice_pdf) ?? readString(details.invoice_pdf_url),
    receipt_url: readString(details.receipt_url),
    subtotal_cents: order.subtotal_cents,
    tax_cents: readNumber(readRecord(details.tax_summary).amount_cents) ?? 0,
    shipping_cents: order.shipping_amount_cents,
    total_cents: order.total_cents,
    amount_paid_cents: order.total_cents,
    currency: order.currency,
    metadata_json: {
      source: "checkout.session.completed",
      order_reference: order.stripe_checkout_session_id
    }
  };

  const savedInvoice = await upsertBillingInvoice(client, record);
  if (!savedInvoice.ok || !savedInvoice.billingInvoiceId) return savedInvoice;

  const lineResult = await upsertBillingInvoiceItemsForOrder(client, savedInvoice.billingInvoiceId, order, hostedSubscriptions);
  if (!lineResult.ok) return lineResult;

  return savedInvoice;
}

export async function recordBillingInvoiceFromStripeInvoice(invoice: StripeInvoiceLike) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return recordBillingInvoiceFromStripeInvoiceWithClient(getSupabaseAdmin() as OrdersDbClient, invoice);
}

export async function recordBillingInvoiceFromStripeInvoiceWithClient(client: OrdersDbClient, invoice: StripeInvoiceLike) {
  const invoiceId = readString(invoice.id);
  if (!invoiceId) return { ok: true as const, skipped: true as const };

  const existingInvoice = await findBillingInvoiceByStripeId(client, invoiceId);
  const subscriptionId = readStripeId(invoice.subscription);
  const hostedSubscriptions = subscriptionId ? await findHostedSubscriptionsByStripeId(client, subscriptionId) : [];
  const hostedSubscription = hostedSubscriptions[0] ?? null;
  const stripeCustomerId = readStripeId(invoice.customer);
  const customerByStripeId = stripeCustomerId ? await findCustomerByStripeCustomerId(client, stripeCustomerId) : null;
  const hostedCustomer = hostedSubscription?.customer_id ? await findCustomerById(client, hostedSubscription.customer_id) : null;
  const email = (
    readString(invoice.customer_email) ??
    readString(hostedCustomer?.email) ??
    readString(customerByStripeId?.email) ??
    readString(existingInvoice.email) ??
    readStripeCustomerEmail(invoice.customer)
  )?.toLowerCase();
  if (!email) return { ok: true as const, skipped: true as const };

  const customerId =
    hostedSubscription?.customer_id ??
    customerByStripeId?.id ??
    readString(existingInvoice.customer_id) ??
    await findCustomerIdByEmail(client, email);
  const paymentIntentId = readStripeId(invoice.payment_intent);
  const hasCheckoutBreakdown = Boolean(readString(existingInvoice.order_id) || readString(existingInvoice.stripe_checkout_session_id));

  const record: BillingInvoiceRecord = {
    customer_id: customerId,
    order_id: hostedSubscription?.order_id ?? readString(existingInvoice.order_id) ?? null,
    hosted_subscription_id: hostedSubscription?.id ?? readString(existingInvoice.hosted_subscription_id) ?? null,
    email,
    stripe_customer_id: stripeCustomerId ?? readString(existingInvoice.stripe_customer_id) ?? null,
    stripe_invoice_id: invoiceId,
    stripe_checkout_session_id: readString(invoice.checkout_session) ?? readString(existingInvoice.stripe_checkout_session_id) ?? null,
    stripe_subscription_id: subscriptionId ?? readString(existingInvoice.stripe_subscription_id) ?? null,
    stripe_payment_intent_id: paymentIntentId ?? readString(existingInvoice.stripe_payment_intent_id) ?? null,
    invoice_number: readString(invoice.number) ?? readString(existingInvoice.invoice_number) ?? null,
    status: readString(invoice.status) ?? readString(existingInvoice.status) ?? null,
    payment_status: invoice.paid ? "paid" : readString(invoice.status) ?? readString(existingInvoice.payment_status) ?? null,
    payment_method_label: readString(existingInvoice.payment_method_label) ?? null,
    hosted_invoice_url: readString(invoice.hosted_invoice_url) ?? readString(existingInvoice.hosted_invoice_url) ?? null,
    invoice_pdf_url: readString(invoice.invoice_pdf) ?? readString(existingInvoice.invoice_pdf_url) ?? null,
    receipt_url: readString(invoice.receipt_url) ?? readString(existingInvoice.receipt_url) ?? null,
    subtotal_cents: hasCheckoutBreakdown
      ? readNumber(existingInvoice.subtotal_cents) ?? readNumber(invoice.subtotal) ?? 0
      : readNumber(invoice.subtotal) ?? 0,
    tax_cents: hasCheckoutBreakdown ? readNumber(existingInvoice.tax_cents) ?? readInvoiceTaxCents(invoice) : readInvoiceTaxCents(invoice),
    shipping_cents: hasCheckoutBreakdown
      ? readNumber(existingInvoice.shipping_cents) ?? readNumber(invoice.shipping_cost?.amount_total) ?? 0
      : readNumber(invoice.shipping_cost?.amount_total) ?? 0,
    total_cents: readNumber(invoice.total) ?? readNumber(existingInvoice.total_cents) ?? 0,
    amount_paid_cents: readNumber(invoice.amount_paid) ?? readNumber(existingInvoice.amount_paid_cents) ?? 0,
    currency: readString(invoice.currency) ?? readString(existingInvoice.currency) ?? "usd",
    issued_at: toIso(invoice.created) ?? readString(existingInvoice.issued_at) ?? null,
    paid_at: toIso(invoice.status_transitions?.paid_at) ?? readString(existingInvoice.paid_at) ?? null,
    period_start: toIso(invoice.period_start) ?? readString(existingInvoice.period_start) ?? null,
    period_end: toIso(invoice.period_end) ?? readString(existingInvoice.period_end) ?? null,
    metadata_json: {
      ...readRecord(existingInvoice.metadata_json),
      source: "invoice.webhook",
      stripe_metadata: invoice.metadata ?? {}
    }
  };

  const savedInvoice = await upsertBillingInvoice(client, record);
  if (!savedInvoice.ok || !savedInvoice.billingInvoiceId) return savedInvoice;

  if (hostedSubscriptions.length) {
    const lineResult = await upsertBillingInvoiceItemsForHostedSubscriptions(client, savedInvoice.billingInvoiceId, hostedSubscriptions);
    if (!lineResult.ok) return lineResult;
  }

  return savedInvoice;
}

async function upsertBillingInvoice(client: OrdersDbClient, record: BillingInvoiceRecord) {
  const payload = {
    ...record,
    updated_at: new Date().toISOString()
  };

  const { error } = await client.from("billing_invoices").upsert(payload, { onConflict: "stripe_invoice_id" });
  if (error) return { ok: false as const, error: error.message };

  const invoiceId = await findBillingInvoiceId(client, record.stripe_invoice_id);
  return { ok: true as const, skipped: false as const, billingInvoiceId: invoiceId };
}

async function findBillingInvoiceId(client: OrdersDbClient, stripeInvoiceId?: string | null) {
  if (!stripeInvoiceId) return null;
  const result = await client.from("billing_invoices").select("id").eq("stripe_invoice_id", stripeInvoiceId).maybeSingle();
  return result.error ? null : readString(readRecord(result.data).id) ?? null;
}

async function findBillingInvoiceByStripeId(client: OrdersDbClient, stripeInvoiceId: string) {
  const result = await client.from("billing_invoices").select("*").eq("stripe_invoice_id", stripeInvoiceId).maybeSingle();
  return result.error ? {} : readRecord(result.data);
}

async function upsertBillingInvoiceItemsForOrder(
  client: OrdersDbClient,
  billingInvoiceId: string,
  order: OrderRecord,
  hostedSubscriptions: Array<{ id: string | null; hosted_page_url?: string | null }> = []
) {
  let hostedItemIndex = 0;
  const items = order.line_items_json.map((item, index) => {
    const hostedSubscription = isHostedOrderLine(item) ? hostedSubscriptions[hostedItemIndex++] ?? null : null;
    return buildInvoiceItemFromOrderLine(billingInvoiceId, order, item, index, hostedSubscription);
  });
  return upsertBillingInvoiceItems(client, items);
}

async function upsertBillingInvoiceItemsForHostedSubscriptions(
  client: OrdersDbClient,
  billingInvoiceId: string,
  subscriptions: Array<{ id: string | null; order_id: string | null; hosted_page_url?: string | null }>
) {
  const items = subscriptions.map((subscription, index) => ({
    billing_invoice_id: billingInvoiceId,
    order_id: subscription.order_id,
    hosted_subscription_id: subscription.id,
    line_item_index: index,
    title: "Hosted Multi-Link page",
    option_label: "Monthly hosting",
    quantity: 1,
    amount_cents: 0,
    recurring_amount_cents: 0,
    hosted_page_url: subscription.hosted_page_url ?? null,
    metadata_json: { source: "hosted_subscription_invoice" }
  }));
  return upsertBillingInvoiceItems(client, items);
}

async function upsertBillingInvoiceItems(client: OrdersDbClient, items: BillingInvoiceItemRecord[]) {
  for (const item of items) {
    const { error } = await client.from("billing_invoice_items").upsert(
      {
        ...item,
        updated_at: new Date().toISOString()
      },
      { onConflict: "billing_invoice_id,line_item_index" }
    );
    if (error) return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

function buildInvoiceItemFromOrderLine(
  billingInvoiceId: string,
  order: OrderRecord,
  item: OrderLineItem,
  index: number,
  hostedSubscription: { id: string | null; hosted_page_url?: string | null } | null = null
): BillingInvoiceItemRecord {
  const setup = readRecord(item.setup);
  return {
    billing_invoice_id: billingInvoiceId,
    order_id: order.id ?? null,
    hosted_subscription_id: hostedSubscription?.id ?? null,
    line_item_index: index,
    title: item.title,
    option_label: item.optionLabel ?? null,
    quantity: item.quantity,
    amount_cents: item.lineSubtotalCents,
    recurring_amount_cents: (readNumber(setup.monthlyPriceCents) ?? readNumber(setup.monthly_price_cents) ?? 0) * item.quantity,
    hosted_page_url: hostedSubscription?.hosted_page_url ?? readString(setup.hostedPageUrl) ?? null,
    metadata_json: {
      product_id: item.productId,
      option_id: item.optionId ?? null,
      sku: item.sku,
      destination_mode: item.destinationMode ?? null
    }
  };
}

function isHostedOrderLine(item: OrderLineItem) {
  const setup = readRecord(item.setup);
  return item.destinationMode === "HOSTED" || setup.serviceMode === "HOSTED" || setup.serviceAddon === "hosted_multilink";
}

async function findCustomerIdByEmail(client: OrdersDbClient, email: string) {
  const result = await client.from("customers").select("id").eq("email", email).maybeSingle();
  return result.error ? null : readString(readRecord(result.data).id) ?? null;
}

async function findHostedSubscriptionsByStripeId(client: OrdersDbClient, stripeSubscriptionId: string) {
  const result = await client
    .from("hosted_subscriptions")
    .select("id,customer_id,order_id,hosted_page_url,stripe_subscription_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .order("created_at", { ascending: false });
  if (result.error || !Array.isArray(result.data)) return [];
  return result.data.map((value: unknown) => {
    const row = readRecord(value);
    return {
      id: readString(row.id) ?? null,
      customer_id: readString(row.customer_id) ?? null,
      order_id: readString(row.order_id) ?? null,
      hosted_page_url: readString(row.hosted_page_url) ?? null,
      stripe_subscription_id: readString(row.stripe_subscription_id) ?? null
    };
  });
}

async function findHostedSubscriptionsByOrderId(client: OrdersDbClient, orderId: string) {
  const result = await client
    .from("hosted_subscriptions")
    .select("id,customer_id,order_id,hosted_page_url,stripe_subscription_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (result.error || !Array.isArray(result.data)) return [];
  return result.data.map((value: unknown) => {
    const row = readRecord(value);
    return {
      id: readString(row.id) ?? null,
      customer_id: readString(row.customer_id) ?? null,
      order_id: readString(row.order_id) ?? null,
      hosted_page_url: readString(row.hosted_page_url) ?? null,
      stripe_subscription_id: readString(row.stripe_subscription_id) ?? null
    };
  });
}

async function findCustomerByStripeCustomerId(client: OrdersDbClient, stripeCustomerId: string) {
  const subscriptionResult = await client
    .from("hosted_subscriptions")
    .select("customer_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .order("created_at", { ascending: false })
    .limit(1);
  const subscriptionCustomerId = Array.isArray(subscriptionResult.data)
    ? readString(readRecord(subscriptionResult.data[0]).customer_id)
    : undefined;
  if (subscriptionCustomerId) {
    const customer = await findCustomerById(client, subscriptionCustomerId);
    if (customer) return customer;
  }

  const orderResult = await client
    .from("orders")
    .select("email,customer_details_json")
    .order("created_at", { ascending: false })
    .limit(50);
  if (Array.isArray(orderResult.data)) {
    for (const row of orderResult.data) {
      const value = readRecord(row);
      const details = readRecord(value.customer_details_json);
      if (readString(details.stripe_customer_id) === stripeCustomerId) {
        const email = readString(value.email);
        const id = email ? await findCustomerIdByEmail(client, email.toLowerCase()) : null;
        return email ? { id, email } : null;
      }
    }
  }

  return null;
}

async function findCustomerById(client: OrdersDbClient, customerId: string) {
  const result = await client.from("customers").select("id,email").eq("id", customerId).maybeSingle();
  if (result.error || !result.data) return null;
  const row = readRecord(result.data);
  const id = readString(row.id);
  const email = readString(row.email);
  return id && email ? { id, email } : null;
}

function readInvoiceTaxCents(invoice: StripeInvoiceLike) {
  if (typeof invoice.tax === "number" && Number.isFinite(invoice.tax)) return invoice.tax;
  return Array.isArray(invoice.total_tax_amounts)
    ? invoice.total_tax_amounts.reduce((total, row) => total + (readNumber(row.amount) ?? 0), 0)
    : 0;
}

function readPaymentMethodLabel(details: Record<string, unknown>) {
  const method = readRecord(details.payment_method_details);
  const type = readString(method.type);
  const brand = readString(method.brand);
  const last4 = readString(method.last4);
  if (type === "card" || brand || last4) return [brand ? capitalize(brand) : "Card", last4 ? `ending ${last4}` : undefined].filter(Boolean).join(" ");
  if (type === "paypal") return "PayPal";
  return type ? capitalize(type.replaceAll("_", " ")) : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStripeId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") return readString((value as Record<string, unknown>).id);
  return undefined;
}

function readStripeCustomerEmail(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  return readString((value as Record<string, unknown>).email);
}

function toIso(epochSeconds: unknown) {
  return typeof epochSeconds === "number" && Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000).toISOString() : null;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
