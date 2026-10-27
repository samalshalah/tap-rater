import { emptyPortal, normalizeCustomer, normalizeBusiness, normalizeDevice, normalizeDeliveryAddress, normalizeOrder, normalizeSubscription, normalizeInvoice, deriveInvoicesFromOrders, readRecord, readString, readNumber, readPaymentMethodLabel, readOrderUrl, readOrderValue, capitalize, countLineItems, normalizeOrderItems, buildCustomerStands, readProofPreviewString, normalizeOrderLineItem } from "./customer-portal-normalizers";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { type OrderLineItem, type OrderRecord } from "@/lib/orders";
import { isOrderPaymentConfirmed } from "@/lib/order-fulfillment-rules";

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
  address?: string;
  phone?: string;
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
  invoicePdfUrl?: string;
  hostedInvoiceUrl?: string;
  receiptUrl?: string;
  customerName?: string;
  deliveryAddress?: string[];
  taxCents?: number;
  productionStatus: string;
  shippingStatus: string;
  trackingUrl?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
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
  standId?: string;
  standLineId?: string;
  unitNumber?: number;
  registryId?: string;
  assignedBusinessId?: string;
  assignedBusinessName?: string;
  standLabel?: string;
  assignmentVersion?: number;
  deviceCode?: string;
  proofReviewAvailable?: boolean;
  proofAvailable?: boolean;
  proofQuantity?: number;
  orderReference: string;
  paymentStatus?: string;
  title: string;
  quantity: number;
  kind: "standard" | "branded" | "multilink" | "custom";
  businessName?: string;
  destinationUrl?: string;
  logoUrl?: string;
  proofPreviewUrl?: string;
  productImageUrl?: string;
  proofTemplateUrl?: string;
  qrTargetUrl?: string;
  nfcTargetUrl?: string;
  hostedPageUrl?: string;
  hostedPageCode?: string;
  multiLinkSetupPending: boolean;
  proofStatus: "not_needed" | "needs_review" | "approved";
  productionStatus: string;
  shippingStatus: string;
  trackingUrl?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
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
  billingProfileAvailable: boolean;
  source?: string;
  createdAt?: string;
};

export type CustomerPortalInvoice = {
  id: string;
  orderId?: string;
  invoiceNumber?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethodLabel: string;
  invoiceUrl?: string;
  invoicePdfUrl?: string;
  hostedInvoiceUrl?: string;
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

export type CustomerPortalLicence = {
  id: string; title: string; source: string; status: string; expiresAt?: string; updatedAt?: string; locationLimit?: number;
};

export type CustomerPortalData = {
  licences?: CustomerPortalLicence[];
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

export function countPaidStandQuantity(orders: Pick<CustomerPortalOrder, "status" | "paymentStatus" | "itemCount">[]) {
  return orders.reduce((total, order) => isOrderPaymentConfirmed(order.status as OrderRecord["status"], order.paymentStatus)
    ? total + order.itemCount
    : total, 0);
}

export function countMultiLinkPages(subscriptions: Pick<CustomerPortalSubscription, "permanentCode">[]) {
  // Provisioned page identities survive order refunds and subscription renewals.
  return new Set(subscriptions.map((subscription) => subscription.permanentCode.trim()).filter(Boolean)).size;
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

  const [{ data: businessRows }, { data: deviceRows }, { data: eventRows }, { data: orderRows }, { data: subscriptionRows }, invoiceResult, accessResult] = await Promise.all([
    client.from("businesses").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    client.from("devices").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    client.from("tap_events").select("device_id"),
    client.from("orders").select("*").eq("email", customer.email).order("created_at", { ascending: false }),
    client.from("hosted_subscriptions").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    loadCustomerInvoices(client, customer),
    client.from("customer_marketing_access").select("*").eq("customer_id", customer.id)
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
    subscriptions,
    licences: Array.isArray(accessResult.data) ? accessResult.data.filter((row: any)=>row.source === "manual" || row.source === "testing").map((row: any)=>({id: `reviews-${customer.id}`, title: "Reviews service", source: row.source, status: row.status, expiresAt: row.expires_at || undefined, updatedAt: row.updated_at || undefined, locationLimit: row.unlimited_locations ? undefined : row.location_limit})) : []
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
