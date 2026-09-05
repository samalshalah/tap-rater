import { customerCookieName, isActiveCustomerSessionWithClient, parseCustomerSession } from "@/lib/customer-auth";

export type CustomerBillingDbClient = {
  from: (table: string) => any;
};

export async function findStripeCustomerIdForEmail(
  client: CustomerBillingDbClient,
  email: string,
  options: { requireActiveAccount?: boolean; stripeMode?: "test" | "live"; subscriptionId?: string | null } = {}
) {
  const normalizedEmail = normalizeEmail(email);
  const { data: customer } = await client.from("customers").select("id,email,account_status").eq("email", normalizedEmail).maybeSingle();
  const customerId = readString(customer?.id);
  if (options.requireActiveAccount && customer?.account_status !== "active") return null;

  if (options.subscriptionId) {
    if (!customerId) return null;

    const { data: subscription } = await client
      .from("hosted_subscriptions")
      .select("stripe_customer_id,stripe_checkout_session_id")
      .eq("customer_id", customerId)
      .eq("id", options.subscriptionId)
      .maybeSingle();

    return isStripeRecordForMode(subscription, options.stripeMode) ? readString(subscription?.stripe_customer_id) : null;
  }

  if (customerId) {
    const { data: subscriptions } = await client
      .from("hosted_subscriptions")
      .select("stripe_customer_id,stripe_checkout_session_id,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);
    const subscriptionCustomerId = firstStripeCustomerId(subscriptions, options.stripeMode);
    if (subscriptionCustomerId) return subscriptionCustomerId;
  }

  const { data: orders } = await client
    .from("orders")
    .select("stripe_checkout_session_id,customer_details_json,created_at")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(10);

  return firstStripeCustomerIdFromOrders(orders, options.stripeMode);
}

export async function findAuthenticatedStripeCustomerIdForCheckout(
  client: CustomerBillingDbClient,
  request: Request,
  checkoutEmail: string,
  stripeMode: "test" | "live"
) {
  const session = parseCustomerSession(readCookie(request.headers.get("cookie"), customerCookieName));
  if (!session || normalizeEmail(session.email) !== normalizeEmail(checkoutEmail)) {
    return null;
  }

  if (!(await isActiveCustomerSessionWithClient(client, session.email, session.issuedAt))) return null;

  return findStripeCustomerIdForEmail(client, session.email, { requireActiveAccount: true, stripeMode });
}

function firstStripeCustomerId(rows: unknown, stripeMode?: "test" | "live") {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!isStripeRecordForMode(row, stripeMode)) continue;
    const id = readString(readRecord(row).stripe_customer_id);
    if (id) return id;
  }
  return null;
}

function firstStripeCustomerIdFromOrders(rows: unknown, stripeMode?: "test" | "live") {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!isStripeRecordForMode(row, stripeMode)) continue;
    const details = readRecord(readRecord(row).customer_details_json);
    const id = readString(details.stripe_customer_id);
    if (id) return id;
  }
  return null;
}

function isStripeRecordForMode(value: unknown, stripeMode?: "test" | "live") {
  if (!stripeMode) return true;
  const sessionId = readString(readRecord(value).stripe_checkout_session_id);
  return Boolean(sessionId?.startsWith(`cs_${stripeMode}_`));
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1 || part.slice(0, separatorIndex).trim() !== name) continue;
    return part.slice(separatorIndex + 1).trim();
  }

  return undefined;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
