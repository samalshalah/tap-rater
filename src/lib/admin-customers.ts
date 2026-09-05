import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import {
  createCustomerActivationToken,
  customerActivationTtlMs,
  type CustomerAccountStatus
} from "@/lib/customer-account";
import { sendCustomerActivationEmail } from "@/lib/hosted-setup-email";

type AdminCustomersDbClient = {
  from: (table: string) => any;
};

const activationResendCooldownMs = 5 * 60 * 1000;

export type AdminCustomerActivationResult =
  | { ok: true }
  | { ok: false; error: string; status: number; retryAfterSeconds?: number };

type AdminCustomerActivationDependencies = {
  now?: Date;
  createActivationTokenFn?: typeof createCustomerActivationToken;
  sendCustomerActivationEmailFn?: typeof sendCustomerActivationEmail;
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
  canReactivate: boolean;
};

export async function getAdminCustomers(): Promise<{ configured: boolean; customers: AdminCustomerSummary[] }> {
  if (!hasSupabaseAdminConfig()) {
    return { configured: false, customers: [] };
  }

  try {
    const client = getSupabaseAdmin() as AdminCustomersDbClient;
    const [customerResult, businessResult, orderResult, subscriptionResult] = await Promise.all([
      client.from("customers").select("id,email,name,phone,password_hash,account_status,created_at").order("created_at", { ascending: false }).limit(500),
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

export async function updateAdminCustomerAccess(id: string, status: "active" | "disabled") {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Customer storage is not configured.");
  }

  return updateAdminCustomerAccessWithClient(getSupabaseAdmin() as AdminCustomersDbClient, id, status);
}

export async function resendAdminCustomerActivation(id: string): Promise<AdminCustomerActivationResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Customer storage is not configured.", status: 503 };
  }

  return resendAdminCustomerActivationWithClient(getSupabaseAdmin() as AdminCustomersDbClient, id);
}

export async function resendAdminCustomerActivationWithClient(
  client: AdminCustomersDbClient,
  id: string,
  dependencies: AdminCustomerActivationDependencies = {}
): Promise<AdminCustomerActivationResult> {
  const now = dependencies.now ?? new Date();
  const { data: customer, error: customerError } = await client
    .from("customers")
    .select("id,email,account_status,activation_token_hash,activation_expires_at")
    .eq("id", id)
    .maybeSingle();

  if (customerError || !customer?.id) {
    return { ok: false, error: "Customer account was not found.", status: 404 };
  }

  const accountStatus = readString(customer.account_status) as CustomerAccountStatus | undefined;
  if (accountStatus !== "pending_activation") {
    return { ok: false, error: "Only pending customer accounts can receive an activation email.", status: 409 };
  }

  const email = readString(customer.email)?.toLowerCase();
  if (!email) {
    return { ok: false, error: "Customer email is missing.", status: 409 };
  }

  const previousExpiresAt = readString(customer.activation_expires_at) ?? null;
  const previousTokenHash = readString(customer.activation_token_hash) ?? null;
  const cooldown = getActivationResendCooldown(previousExpiresAt, now);
  if (cooldown > 0) {
    return {
      ok: false,
      error: "An activation email was sent recently. Wait a few minutes before trying again.",
      status: 429,
      retryAfterSeconds: cooldown
    };
  }

  const createActivationTokenFn = dependencies.createActivationTokenFn ?? createCustomerActivationToken;
  const activation = createActivationTokenFn();
  const activationExpiresAt = new Date(now.getTime() + customerActivationTtlMs).toISOString();
  const { data: updatedCustomer, error: updateError } = await client
    .from("customers")
    .update({
      activation_token_hash: activation.tokenHash,
      activation_expires_at: activationExpiresAt,
      updated_at: now.toISOString()
    })
    .eq("id", id)
    .eq("account_status", "pending_activation")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { ok: false, error: "A new activation link could not be created.", status: 500 };
  }
  if (!updatedCustomer?.id) {
    return { ok: false, error: "The customer account is no longer pending activation.", status: 409 };
  }

  const sendCustomerActivationEmailFn = dependencies.sendCustomerActivationEmailFn ?? sendCustomerActivationEmail;
  let emailResult;
  try {
    emailResult = await sendCustomerActivationEmailFn({
      to: email,
      activationToken: activation.token,
      customerId: id
    });
  } catch {
    emailResult = { sent: false as const, reason: "email_send_exception" };
  }

  if (!emailResult.sent) {
    const { error: rollbackError } = await client
      .from("customers")
      .update({
        activation_token_hash: previousTokenHash,
        activation_expires_at: previousExpiresAt,
        updated_at: now.toISOString()
      })
      .eq("id", id)
      .eq("activation_token_hash", activation.tokenHash);

    console.warn("[admin-customers] activation_email_not_sent", {
      customerId: id,
      reason: emailResult.reason,
      activationStateRestored: !rollbackError
    });
    return { ok: false, error: "The activation email could not be sent. Try again.", status: 502 };
  }

  return { ok: true };
}

export async function updateAdminCustomerAccessWithClient(
  client: AdminCustomersDbClient,
  id: string,
  status: "active" | "disabled"
) {
  const { data: customer, error: customerError } = await client
    .from("customers")
    .select("id,account_status,password_hash")
    .eq("id", id)
    .maybeSingle();

  if (customerError || !customer?.id) {
    throw new Error("Customer account was not found.");
  }

  if (status === "active" && !readString(customer.password_hash)) {
    throw new Error("This customer must activate the account and create a password before access can be enabled.");
  }

  const { error } = await client
    .from("customers")
    .update({
      account_status: status,
      ...(status === "disabled" ? { activation_token_hash: null, activation_expires_at: null } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    throw new Error("Customer access could not be updated.");
  }

  return { ok: true as const, status };
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
      createdAt: readString(row.created_at),
      canReactivate: Boolean(readString(row.password_hash))
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
      createdAt: readString(row.created_at),
      canReactivate: false
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

function getActivationResendCooldown(activationExpiresAt: string | null, now: Date) {
  if (!activationExpiresAt) return 0;
  const expiresAt = new Date(activationExpiresAt);
  if (!Number.isFinite(expiresAt.getTime())) return 0;

  const issuedAt = expiresAt.getTime() - customerActivationTtlMs;
  const remainingMs = activationResendCooldownMs - (now.getTime() - issuedAt);
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
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
