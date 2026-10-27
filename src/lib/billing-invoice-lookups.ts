import type { OrdersDbClient } from "@/lib/orders";
import { readRecord, readString } from "./billing-invoice-values";

export async function findBillingInvoiceId(client: OrdersDbClient, stripeInvoiceId?: string | null) {
  if (!stripeInvoiceId) return null;
  const result = await client.from("billing_invoices").select("id").eq("stripe_invoice_id", stripeInvoiceId).maybeSingle();
  if (result.error) throw new Error("Invoice identity lookup failed.");
  return readString(readRecord(result.data).id) ?? null;
}

export async function findBillingInvoiceByStripeId(client: OrdersDbClient, stripeInvoiceId: string) {
  const result = await client.from("billing_invoices").select("*").eq("stripe_invoice_id", stripeInvoiceId).maybeSingle();
  if (result.error) throw new Error("Invoice lookup failed.");
  return readRecord(result.data);
}

export async function findCustomerIdByEmail(client: OrdersDbClient, email: string) {
  const result = await client.from("customers").select("id").eq("email", email).maybeSingle();
  if (result.error) throw new Error("Invoice customer lookup failed.");
  return readString(readRecord(result.data).id) ?? null;
}

export async function findHostedSubscriptionsByStripeId(client: OrdersDbClient, stripeSubscriptionId: string) {
  const result = await client
    .from("hosted_subscriptions")
    .select("id,customer_id,order_id,hosted_page_url,stripe_subscription_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .order("created_at", { ascending: false });
  if (result.error) throw new Error("Invoice subscription lookup failed.");
  if (!Array.isArray(result.data)) return [];
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

export async function findHostedSubscriptionsByOrderId(client: OrdersDbClient, orderId: string) {
  const result = await client
    .from("hosted_subscriptions")
    .select("id,customer_id,order_id,hosted_page_url,stripe_subscription_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (result.error) throw new Error("Invoice order subscription lookup failed.");
  if (!Array.isArray(result.data)) return [];
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

export async function findCustomerByStripeCustomerId(client: OrdersDbClient, stripeCustomerId: string) {
  const subscriptionResult = await client
    .from("hosted_subscriptions")
    .select("customer_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (subscriptionResult.error) throw new Error("Invoice Stripe customer lookup failed.");
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
  if (orderResult.error) throw new Error("Invoice customer order lookup failed.");
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

export async function findCustomerById(client: OrdersDbClient, customerId: string) {
  const result = await client.from("customers").select("id,email").eq("id", customerId).maybeSingle();
  if (result.error) throw new Error("Invoice customer lookup failed.");
  if (!result.data) return null;
  const row = readRecord(result.data);
  const id = readString(row.id);
  const email = readString(row.email);
  return id && email ? { id, email } : null;
}
