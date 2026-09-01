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
  productionStatus: string;
  shippingStatus: string;
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
  orderReference: string;
  title: string;
  quantity: number;
  kind: "standard" | "branded" | "multilink" | "custom";
  businessName?: string;
  destinationUrl?: string;
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

export type CustomerPortalData = {
  configured: boolean;
  customer: CustomerPortalCustomer | null;
  businesses: CustomerPortalBusiness[];
  devices: CustomerPortalDevice[];
  orders: CustomerPortalOrder[];
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

  const [{ data: businessRows }, { data: deviceRows }, { data: eventRows }, { data: orderRows }, { data: subscriptionRows }] = await Promise.all([
    client.from("businesses").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    client.from("devices").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    client.from("tap_events").select("device_id"),
    client.from("orders").select("*").eq("email", customer.email).order("created_at", { ascending: false }),
    client.from("hosted_subscriptions").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false })
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

  return {
    configured: true,
    customer,
    businesses: Array.isArray(businessRows) ? businessRows.map(normalizeBusiness).filter((business): business is CustomerPortalBusiness => Boolean(business)) : [],
    devices: Array.isArray(deviceRows) ? deviceRows.map((row) => normalizeDevice(row, tapCounts)).filter((device): device is CustomerPortalDevice => Boolean(device)) : [],
    orders,
    stands: buildCustomerStands(orders, subscriptions),
    subscriptions
  };
}

function emptyPortal(configured: boolean): CustomerPortalData {
  return { configured, customer: null, businesses: [], devices: [], orders: [], stands: [], subscriptions: [] };
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
    productionStatus: readString(value.production_status) ?? "not_started",
    shippingStatus: readString(value.shipping_status) ?? "not_shipped",
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

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
        orderReference: order.reference,
        title: item.title,
        quantity: item.quantity,
        kind,
        businessName: summary.businessName,
        destinationUrl,
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
