import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

type AdminCustomersDbClient = {
  from: (table: string) => any;
};

export type AdminCustomerSummary = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  accountStatus: string;
  businessNames: string[];
  orderCount: number;
  paidTotalCents: number;
  subscriptionCount: number;
  activeSubscriptionCount: number;
  createdAt?: string;
};

export async function getAdminCustomers(): Promise<{ configured: boolean; customers: AdminCustomerSummary[] }> {
  if (!hasSupabaseAdminConfig()) {
    return { configured: false, customers: [] };
  }

  try {
    const client = getSupabaseAdmin() as AdminCustomersDbClient;
    const [customerResult, businessResult, orderResult, subscriptionResult] = await Promise.all([
      client.from("customers").select("id,email,name,phone,account_status,created_at").order("created_at", { ascending: false }).limit(500),
      client.from("businesses").select("id,customer_id,business_name,status").limit(1000),
      client.from("orders").select("id,email,total_cents,status,created_at").limit(2000),
      client.from("hosted_subscriptions").select("id,customer_id,status,lifecycle_status").limit(1000)
    ]);

    if (customerResult.error || businessResult.error || orderResult.error || subscriptionResult.error) {
      return { configured: true, customers: [] };
    }

    return {
      configured: true,
      customers: buildAdminCustomerSummaries({
        businesses: Array.isArray(businessResult.data) ? businessResult.data : [],
        customers: Array.isArray(customerResult.data) ? customerResult.data : [],
        orders: Array.isArray(orderResult.data) ? orderResult.data : [],
        subscriptions: Array.isArray(subscriptionResult.data) ? subscriptionResult.data : []
      })
    };
  } catch {
    return { configured: true, customers: [] };
  }
}

export function buildAdminCustomerSummaries(input: {
  businesses: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
}) {
  const summaries = new Map<string, AdminCustomerSummary>();
  const customerIdByEmail = new Map<string, string>();

  for (const row of input.customers) {
    const email = readString(row.email)?.toLowerCase();
    if (!email) continue;
    const id = readString(row.id) ?? `customer:${email}`;
    customerIdByEmail.set(email, id);
    summaries.set(email, {
      id,
      email,
      name: readString(row.name),
      phone: readString(row.phone),
      accountStatus: readString(row.account_status) ?? "unknown",
      businessNames: [],
      orderCount: 0,
      paidTotalCents: 0,
      subscriptionCount: 0,
      activeSubscriptionCount: 0,
      createdAt: readString(row.created_at)
    });
  }

  for (const row of input.orders) {
    const email = readString(row.email)?.toLowerCase();
    if (!email) continue;
    const summary = summaries.get(email) ?? {
      id: `guest:${email}`,
      email,
      accountStatus: "guest",
      businessNames: [],
      orderCount: 0,
      paidTotalCents: 0,
      subscriptionCount: 0,
      activeSubscriptionCount: 0,
      createdAt: readString(row.created_at)
    };
    summary.orderCount += 1;
    if (row.status === "paid") {
      summary.paidTotalCents += readInteger(row.total_cents);
    }
    summaries.set(email, summary);
  }

  const summaryByCustomerId = new Map<string, AdminCustomerSummary>();
  for (const [email, customerId] of customerIdByEmail) {
    const summary = summaries.get(email);
    if (summary) summaryByCustomerId.set(customerId, summary);
  }

  for (const row of input.businesses) {
    const customerId = readString(row.customer_id);
    const businessName = readString(row.business_name);
    const summary = customerId ? summaryByCustomerId.get(customerId) : undefined;
    if (summary && businessName && !summary.businessNames.includes(businessName)) {
      summary.businessNames.push(businessName);
    }
  }

  for (const row of input.subscriptions) {
    const customerId = readString(row.customer_id);
    const summary = customerId ? summaryByCustomerId.get(customerId) : undefined;
    if (summary) {
      summary.subscriptionCount += 1;
      if (isActiveSubscription(row)) summary.activeSubscriptionCount += 1;
    }
  }

  return Array.from(summaries.values()).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

function isActiveSubscription(row: Record<string, unknown>) {
  const status = readString(row.status)?.toLowerCase();
  const lifecycleStatus = readString(row.lifecycle_status)?.toUpperCase();

  return (
    status === "active" ||
    status === "trialing" ||
    lifecycleStatus === "ACTIVE" ||
    lifecycleStatus === "REACTIVATED" ||
    lifecycleStatus === "CANCELLED_AT_PERIOD_END"
  );
}
