import { findBillingInvoiceId, findBillingInvoiceByStripeId, findCustomerIdByEmail, findHostedSubscriptionsByStripeId, findHostedSubscriptionsByOrderId, findCustomerByStripeCustomerId, findCustomerById } from "./billing-invoice-lookups";
import { readInvoiceTaxCents, readStripeInvoiceSubscriptionId, readPaymentMethodLabel, readRecord, readString, readNumber, readStripeId, readStripeCustomerEmail, toIso } from "./billing-invoice-values";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { OrderLineItem, OrdersDbClient, OrderRecord, StripeCheckoutSessionLike } from "@/lib/orders";
import { withStripePaymentLock } from "@/lib/stripe-processing";

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
  parent?: {
    type?: string | null;
    subscription_details?: {
      subscription?: string | { id?: string | null } | null;
    } | null;
  } | null;
  payment_intent?: string | { id?: string | null } | null;
  checkout_session?: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  receipt_url?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total_tax_amounts?: Array<{ amount?: number | null }> | null;
  total_taxes?: Array<{ amount?: number | null }> | null;
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
  const id = readStripeId(session.invoice);
  if (!id) return { ok: false as const, error: "Checkout invoice is not available yet." };
  return withStripePaymentLock(`invoice:${id}`, async () => recordBillingInvoiceFromCheckoutSessionWithClient(getSupabaseAdmin() as OrdersDbClient, order, session));
}

export async function recordBillingInvoiceFromCheckoutSessionWithClient(
  client: OrdersDbClient,
  order: OrderRecord,
  session: StripeCheckoutSessionLike
) {
  const details = readRecord(order.customer_details_json);
  const invoice = readRecord(session.invoice);
  const invoiceId = readStripeId(session.invoice);
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
  if (!invoice.id) return { ok: false as const, error: "Invoice ID is required." };
  return withStripePaymentLock(`invoice:${invoice.id}`, async () => recordBillingInvoiceFromStripeInvoiceWithClient(getSupabaseAdmin() as OrdersDbClient, invoice));
}

export async function recordBillingInvoiceFromStripeInvoiceWithClient(client: OrdersDbClient, invoice: StripeInvoiceLike) {
  const invoiceId = readString(invoice.id);
  if (!invoiceId) return { ok: true as const, skipped: true as const };

  const existingInvoice = await findBillingInvoiceByStripeId(client, invoiceId);
  const subscriptionId = readStripeInvoiceSubscriptionId(invoice);
  const hasCheckoutReference = Boolean(
    readString(existingInvoice.order_id) || readString(existingInvoice.stripe_checkout_session_id)
  );

  // Checkout is authoritative for one-time order totals and links. Skipping an
  // invoice-first delivery prevents a concurrent invoice webhook from replacing
  // the checkout breakdown with Stripe's flattened invoice subtotal.
  if (!subscriptionId && !hasCheckoutReference) {
    return { ok: true as const, skipped: true as const };
  }

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
  const hasCheckoutBreakdown = hasCheckoutReference;

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

  if (hostedSubscriptions.length && !hasCheckoutBreakdown) {
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
  if (!invoiceId) return { ok: false as const, error: "Saved invoice could not be found." };
  return { ok: true as const, skipped: false as const, billingInvoiceId: invoiceId };
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
