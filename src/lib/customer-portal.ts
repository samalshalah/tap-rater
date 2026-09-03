import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getOrderLineItemProductionSummary, type OrderLineItem } from "@/lib/orders";

export type CustomerPortalDbClient = {
  from: (table: string) => any;
};

export type CustomerPortalCustomer = {
  id: string;
  email: string;
  name?: string;
};

export type CustomerPortalBusiness = {
  id: string;
  businessName: string;
  websiteUrl?: string;
  googleReviewUrl?: string;
  facebookUrl?: string;
  yelpUrl?: string;
  bookingUrl?: string;
  status?: string;
};

export type CustomerPortalDevice = {
  id: string;
  deviceCode: string;
  productType: string;
  serviceMode: string;
  status: string;
  destinationType?: string;
  destinationUrl?: string;
  tapCount: number;
  label?: string;
};

export type CustomerPortalOrder = {
  id: string;
  reference: string;
  status: string;
  paymentStatus?: string;
  paymentMethodLabel: string;
  paymentReference?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  productionStatus: string;
  shippingStatus: string;
  subtotalCents: number;
  shippingAmountCents: number;
  totalCents: number;
  currency: string;
  itemCount: number;
  createdAt?: string;
  items: CustomerPortalOrderItem[];
};

export type CustomerPortalOrderItem = {
  id: string;
  title: string;
  quantity: number;
  optionLabel: string;
  unitAmountCents: number;
  lineSubtotalCents: number;
  lineItem: OrderLineItem;
};

export type CustomerPortalStand = {
  id: string;
  orderId: string;
  lineItemIndex: number;
  orderReference: string;
  title: string;
  quantity: number;
  kind: "standard" | "branded" | "multilink" | "custom";
  businessName?: string;
  destinationUrl?: string;
  logoUrl?: string;
  proofPreviewUrl?: string;
  proofTemplateUrl?: string;
  qrTargetUrl?: string;
  nfcTargetUrl?: string;
  hostedPageUrl?: string;
  hostedPageCode?: string;
  proofStatus: "not_needed" | "needs_review" | "approved";
  productionStatus: string;
  shippingStatus: string;
  primaryActionLabel: string;
  primaryActionHref: string;
};

export type CustomerPortalSubscription = {
  id: string;
  hostedPageUrl: string;
  permanentCode: string;
  status: string;
  lifecycleStatus: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
};

export type CustomerPortalInvoice = {
  id: string;
  orderId?: string;
  invoiceNumber?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethodLabel: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  amountPaidCents: number;
  currency: string;
  issuedAt?: string;
  paidAt?: string;
};

export type CustomerPortalData = {
  configured: boolean;
  customer: CustomerPortalCustomer | null;
  businesses: CustomerPortalBusiness[];
  devices: CustomerPortalDevice[];
  orders: CustomerPortalOrder[];
  invoices: CustomerPortalInvoice[];
  stands: CustomerPortalStand[];
  subscriptions: CustomerPortalSubscription[];
};

export function isCustomerPortalConfigured() {
  return hasSupabaseAdminConfig();
}

export async function getCustomerPortal(email: string): Promise<CustomerPortalData> {
  if (!hasSupabaseAdminConfig()) {
    return emptyPortal(false);
  }

  try {
    return await getCustomerPortalFromClient(getSupabaseAdmin() as CustomerPortalDbClient, email);
  } catch {
    return emptyPortal(true);
  }
}

export async function getCustomerPortalFromClient(client: CustomerPortalDbClient, email: string): Promise<CustomerPortalData> {
  const { data: customerRow, error: customerError } = await client
    .from("customers")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  const customer = normalizeCustomer(customerRow);
  if (customerError || !customer) {
    return emptyPortal(true);
  }

  const [{ data: businessRows }, { data: deviceRows }, { data: eventRows }, { data: orderRows }, { data: subscriptionRows }, invoiceResult] = await Promise.all([
    client.from("businesses").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    client.from("devices").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    client.from("tap_events").select("device_id"),
    client.from("orders").select("*").eq("email", customer.email).order("created_at", { ascending: false }),
    client.from("hosted_subscriptions").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    loadCustomerInvoices(client, customer)
  ]);

  const tapCounts = new Map<string, number>();
  if (Array.isArray(eventRows)) {
    for (const event of eventRows) {
      const deviceId = readString(readRecord(event).device_id);
      if (deviceId) {
        tapCounts.set(deviceId, (tapCounts.get(deviceId) ?? 0) + 1);
      }
    }
  }

  const orders = Array.isArray(orderRows) ? orderRows.map(normalizeOrder).filter((order): order is CustomerPortalOrder => Boolean(order)) : [];
  const subscriptions = Array.isArray(subscriptionRows) ? subscriptionRows.map(normalizeSubscription).filter((subscription): subscription is CustomerPortalSubscription => Boolean(subscription)) : [];
  const invoices = invoiceResult.ok ? invoiceResult.invoices : deriveInvoicesFromOrders(orders);

  return {
    configured: true,
    customer,
    businesses: Array.isArray(businessRows) ? businessRows.map(normalizeBusiness).filter((business): business is CustomerPortalBusiness => Boolean(business)) : [],
    devices: Array.isArray(deviceRows) ? deviceRows.map((row) => normalizeDevice(row, tapCounts)).filter((device): device is CustomerPortalDevice => Boolean(device)) : [],
    orders,
    invoices,
    stands: buildCustomerStands(orders, subscriptions),
    subscriptions
  };
}

function emptyPortal(configured: boolean): CustomerPortalData {
  return { configured, customer: null, businesses: [], devices: [], orders: [], invoices: [], stands: [], subscriptions: [] };
}

function normalizeCustomer(row: unknown): CustomerPortalCustomer | null {
  const value = readRecord(row);
  const id = readString(value.id);
  const email = readString(value.email);

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    name: readString(value.name)
  };
}

function normalizeBusiness(row: unknown): CustomerPortalBusiness | null {
  const value = readRecord(row);
  const id = readString(value.id);

  if (!id) {
    return null;
  }

  return {
    id,
    businessName: readString(value.business_name) ?? "Business",
    websiteUrl: readString(value.website_url),
    googleReviewUrl: readString(value.google_review_url),
    facebookUrl: readString(value.facebook_url),
    yelpUrl: readString(value.yelp_url),
    bookingUrl: readString(value.booking_url),
    status: readString(value.status)
  };
}

function normalizeDevice(row: unknown, tapCounts: Map<string, number>): CustomerPortalDevice | null {
  const value = readRecord(row);
  const id = readString(value.id);
  const deviceCode = readString(value.device_code);

  if (!id || !deviceCode) {
    return null;
  }

  return {
    id,
    deviceCode,
    productType: readString(value.product_type) ?? "",
    serviceMode: readString(value.service_mode) ?? "",
    status: readString(value.status) ?? "",
    destinationType: readString(value.destination_type),
    destinationUrl: readString(value.destination_url),
    tapCount: tapCounts.get(id) ?? 0,
    label: readString(value.label)
  };
}

function normalizeOrder(row: unknown): CustomerPortalOrder | null {
  const value = readRecord(row);
  const id = readString(value.id);
  const reference = readString(value.stripe_checkout_session_id);

  if (!id || !reference) {
    return null;
  }

  return {
    id,
    reference,
    status: readString(value.status) ?? "pending_payment",
    paymentStatus: readString(value.payment_status),
    paymentMethodLabel: readPaymentMethodLabel(value),
    paymentReference: readString(value.stripe_payment_intent_id),
    invoiceNumber: readOrderValue(value, ["invoice_number", "invoiceNumber"]),
    invoiceUrl: readOrderUrl(value, ["invoice_pdf_url", "invoicePdfUrl", "hosted_invoice_url", "invoice_url"]),
    receiptUrl: readOrderUrl(value, ["receipt_url", "receiptUrl"]),
    productionStatus: readString(value.production_status) ?? "not_started",
    shippingStatus: readString(value.shipping_status) ?? "not_shipped",
    subtotalCents: readNumber(value.subtotal_cents) ?? 0,
    shippingAmountCents: readNumber(value.shipping_amount_cents) ?? 0,
    totalCents: readNumber(value.total_cents) ?? 0,
    currency: readString(value.currency) ?? "usd",
    itemCount: countLineItems(value.line_items_json),
    items: normalizeOrderItems(value.line_items_json),
    createdAt: readString(value.created_at)
  };
}

function normalizeSubscription(row: unknown): CustomerPortalSubscription | null {
  const value = readRecord(row);
  const id = readString(value.id);
  const hostedPageUrl = readString(value.hosted_page_url);
  const permanentCode = readString(value.permanent_code);

  if (!id || !hostedPageUrl || !permanentCode) {
    return null;
  }

  return {
    id,
    hostedPageUrl,
    permanentCode,
    status: readString(value.status) ?? "unknown",
    lifecycleStatus: readString(value.lifecycle_status) ?? "ACTIVE",
    currentPeriodEnd: readString(value.current_period_end),
    cancelAtPeriodEnd: value.cancel_at_period_end === true
  };
}

async function loadCustomerInvoices(client: CustomerPortalDbClient, customer: CustomerPortalCustomer) {
  try {
    const { data, error } = await client
      .from("billing_invoices")
      .select("*")
      .eq("email", customer.email)
      .order("created_at", { ascending: false });
    if (error || !Array.isArray(data)) return { ok: false as const, invoices: [] };
    return { ok: true as const, invoices: data.map(normalizeInvoice).filter((invoice): invoice is CustomerPortalInvoice => Boolean(invoice)) };
  } catch {
    return { ok: false as const, invoices: [] };
  }
}

function normalizeInvoice(row: unknown): CustomerPortalInvoice | null {
  const value = readRecord(row);
  const id = readString(value.id) ?? readString(value.stripe_invoice_id);
  if (!id) return null;

  return {
    id,
    orderId: readString(value.order_id),
    invoiceNumber: readString(value.invoice_number),
    status: readString(value.status),
    paymentStatus: readString(value.payment_status),
    paymentMethodLabel: readString(value.payment_method_label) ?? "Stripe payment",
    invoiceUrl: readOrderUrl(value, ["invoice_pdf_url", "hosted_invoice_url"]),
    receiptUrl: readString(value.receipt_url),
    subtotalCents: readNumber(value.subtotal_cents) ?? 0,
    taxCents: readNumber(value.tax_cents) ?? 0,
    shippingCents: readNumber(value.shipping_cents) ?? 0,
    totalCents: readNumber(value.total_cents) ?? 0,
    amountPaidCents: readNumber(value.amount_paid_cents) ?? 0,
    currency: readString(value.currency) ?? "usd",
    issuedAt: readString(value.issued_at) ?? readString(value.created_at),
    paidAt: readString(value.paid_at)
  };
}

function deriveInvoicesFromOrders(orders: CustomerPortalOrder[]): CustomerPortalInvoice[] {
  return orders
    .filter((order) => order.invoiceUrl || order.receiptUrl)
    .map((order) => ({
      id: order.invoiceNumber ?? order.reference,
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethodLabel: order.paymentMethodLabel,
      invoiceUrl: order.invoiceUrl,
      receiptUrl: order.receiptUrl,
      subtotalCents: order.subtotalCents,
      taxCents: 0,
      shippingCents: order.shippingAmountCents,
      totalCents: order.totalCents,
      amountPaidCents: order.paymentStatus === "paid" || order.status === "paid" ? order.totalCents : 0,
      currency: order.currency,
      issuedAt: order.createdAt
    }));
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readPaymentMethodLabel(value: Record<string, unknown>) {
  const methodDetails = readRecord(value.payment_method_details);
  const customerDetails = readRecord(value.customer_details_json);
  const nestedMethodDetails = readRecord(customerDetails.payment_method_details);
  const source = Object.keys(methodDetails).length ? methodDetails : nestedMethodDetails;
  const type = readString(source.type) ?? readString(value.payment_method_type) ?? readString(customerDetails.payment_method_type);
  const brand = readString(source.brand) ?? readString(readRecord(source.card).brand);
  const last4 = readString(source.last4) ?? readString(readRecord(source.card).last4);

  if (type === "card" || brand || last4) {
    return [brand ? capitalize(brand) : "Card", last4 ? `ending ${last4}` : undefined].filter(Boolean).join(" ");
  }

  const paypalEmail = readString(source.paypalPayerEmail) ?? readString(readRecord(source.paypal).payer_email);
  if (type === "paypal" && paypalEmail) return `PayPal ${paypalEmail}`;
  if (type === "paypal") return "PayPal";
  if (type) return capitalize(type.replaceAll("_", " "));
  if (readString(value.stripe_payment_intent_id)) return "Stripe payment";
  if (readString(value.payment_status) === "manual_unpaid") return "Manual payment review";
  return "Not recorded yet";
}

function readOrderUrl(value: Record<string, unknown>, keys: string[]) {
  return readOrderValue(value, keys);
}

function readOrderValue(value: Record<string, unknown>, keys: string[]) {
  const customerDetails = readRecord(value.customer_details_json);
  for (const key of keys) {
    const direct = readString(value[key]);
    if (direct) return direct;
    const nested = readString(customerDetails[key]);
    if (nested) return nested;
  }
  return undefined;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function countLineItems(value: unknown) {
  return Array.isArray(value) ? value.reduce((total, item) => total + Math.max(1, readNumber(readRecord(item).quantity) ?? 1), 0) : 0;
}

function normalizeOrderItems(value: unknown): CustomerPortalOrderItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    const row = readRecord(item);
    const title = readString(row.title);
    if (!title) return [];

    return [{
      id: String(index + 1),
      title,
      quantity: Math.max(1, readNumber(row.quantity) ?? 1),
      optionLabel: readString(row.optionLabel) ?? readString(row.option_label) ?? readString(row.optionId) ?? "Configured stand",
      unitAmountCents: readNumber(row.unitAmountCents) ?? readNumber(row.unit_amount_cents) ?? 0,
      lineSubtotalCents: readNumber(row.lineSubtotalCents) ?? readNumber(row.line_subtotal_cents) ?? 0,
      lineItem: normalizeOrderLineItem(row, title)
    }];
  });
}

function buildCustomerStands(orders: CustomerPortalOrder[], subscriptions: CustomerPortalSubscription[]): CustomerPortalStand[] {
  const subscriptionByCode = new Map(subscriptions.map((subscription) => [subscription.permanentCode, subscription]));
  const subscriptionByUrl = new Map(subscriptions.map((subscription) => [subscription.hostedPageUrl, subscription]));

  return orders.flatMap((order) =>
    order.items.map((item, index) => {
      const rawItem = item.lineItem;
      const summary = getOrderLineItemProductionSummary(rawItem);
      const hostedPageCode = readString(rawItem.setup?.hostedPageCode) ?? readString(rawItem.setup?.permanentPageCode);
      const hostedPageUrl = readString(rawItem.setup?.hostedPageUrl) ?? readString(rawItem.setup?.qrTargetUrl);
      const subscription = hostedPageCode ? subscriptionByCode.get(hostedPageCode) : hostedPageUrl ? subscriptionByUrl.get(hostedPageUrl) : undefined;
      const kind = summary.fulfillmentKind === "hosted" ? "multilink" : summary.fulfillmentKind;
      const proofStatus = !summary.proofRequired ? "not_needed" : summary.proofConfirmed ? "approved" : "needs_review";
      const destinationUrl = kind === "multilink" ? hostedPageUrl ?? subscription?.hostedPageUrl : summary.destinationUrl ?? summary.qrTargetUrl ?? summary.nfcTargetUrl;

      return {
        id: `${order.id}-${index + 1}`,
        orderId: order.id,
        lineItemIndex: index,
        orderReference: order.reference,
        title: item.title,
        quantity: item.quantity,
        kind,
        businessName: summary.businessName,
        destinationUrl,
        logoUrl: summary.logoMediaUrl,
        proofPreviewUrl: readProofPreviewString(rawItem.setup, "previewImageUrl") ?? summary.productionArtwork?.url ?? summary.frontTemplateUrl,
        proofTemplateUrl: summary.frontTemplateUrl,
        qrTargetUrl: summary.qrTargetUrl,
        nfcTargetUrl: summary.nfcTargetUrl,
        hostedPageUrl: hostedPageUrl ?? subscription?.hostedPageUrl,
        hostedPageCode: hostedPageCode ?? subscription?.permanentCode,
        proofStatus,
        productionStatus: order.productionStatus,
        shippingStatus: order.shippingStatus,
        primaryActionLabel: kind === "multilink" ? "Manage links" : proofStatus === "needs_review" ? "Review proof" : "View details",
        primaryActionHref: kind === "multilink" && (hostedPageCode ?? subscription?.permanentCode)
          ? `/account/stands?code=${encodeURIComponent(hostedPageCode ?? subscription?.permanentCode ?? "")}#multi-link-editor`
          : kind === "multilink"
            ? "/account/stands#multi-link-editor"
            : "/account/orders"
      };
    })
  );
}

function readProofPreviewString(setup: Record<string, unknown> | undefined, key: string) {
  const proofPreviewData = setup?.proofPreviewData;
  if (!proofPreviewData || typeof proofPreviewData !== "object") {
    return undefined;
  }

  return readString((proofPreviewData as Record<string, unknown>)[key]);
}

function normalizeOrderLineItem(row: Record<string, unknown>, fallbackTitle: string): OrderLineItem {
  return {
    productId: readString(row.productId) ?? readString(row.product_id) ?? fallbackTitle,
    optionId: readString(row.optionId) ?? readString(row.option_id),
    optionLabel: readString(row.optionLabel) ?? readString(row.option_label),
    destinationMode: row.destinationMode === "HOSTED" || row.destinationMode === "DIRECT" ? row.destinationMode : undefined,
    customizationLevel: row.customizationLevel === "STANDARD" || row.customizationLevel === "BRANDED" ? row.customizationLevel : undefined,
    title: fallbackTitle,
    baseSku: readString(row.baseSku) ?? readString(row.base_sku),
    sku: readString(row.sku) ?? fallbackTitle,
    quantity: Math.max(1, readNumber(row.quantity) ?? 1),
    unitAmountCents: readNumber(row.unitAmountCents) ?? readNumber(row.unit_amount_cents) ?? 0,
    lineSubtotalCents: readNumber(row.lineSubtotalCents) ?? readNumber(row.line_subtotal_cents) ?? 0,
    setup: readRecord(row.setup),
    logoRequired: row.logoRequired === true,
    logoStatus: row.logoStatus === "not_required" || row.logoStatus === "uploaded" || row.logoStatus === "manual_collection_required" ? row.logoStatus : undefined,
    logoReference: readString(row.logoReference) ?? readString(row.logo_reference) ?? null,
    proofRequired: row.proofRequired === true,
    proofApproved: row.proofApproved === true,
    productionStatus:
      row.productionStatus === "ready_for_direct_fulfillment" ||
      row.productionStatus === "ready_for_direct_activation" ||
      row.productionStatus === "pending_branded_proof_review" ||
      row.productionStatus === "pending_manual_logo_and_proof" ||
      row.productionStatus === "pending_manual_design_and_proof" ||
      row.productionStatus === "artwork_generation_failed"
        ? row.productionStatus
        : undefined,
    manualProductionRequired: row.manualProductionRequired === true
  };
}
