import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

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

  return {
    configured: true,
    customer,
    businesses: Array.isArray(businessRows) ? businessRows.map(normalizeBusiness).filter((business): business is CustomerPortalBusiness => Boolean(business)) : [],
    devices: Array.isArray(deviceRows) ? deviceRows.map((row) => normalizeDevice(row, tapCounts)).filter((device): device is CustomerPortalDevice => Boolean(device)) : [],
    orders: Array.isArray(orderRows) ? orderRows.map(normalizeOrder).filter((order): order is CustomerPortalOrder => Boolean(order)) : [],
    subscriptions: Array.isArray(subscriptionRows) ? subscriptionRows.map(normalizeSubscription).filter((subscription): subscription is CustomerPortalSubscription => Boolean(subscription)) : []
  };
}

function emptyPortal(configured: boolean): CustomerPortalData {
  return { configured, customer: null, businesses: [], devices: [], orders: [], subscriptions: [] };
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
