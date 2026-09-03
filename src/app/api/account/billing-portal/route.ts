import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getCheckoutSiteUrl, getStripeClient, validateStripeRuntimeConfig } from "@/lib/checkout";

type BillingPortalDbClient = {
  from: (table: string) => any;
};

export async function POST(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;

  const stripeConfig = validateStripeRuntimeConfig();
  if (!stripeConfig.ok) {
    return redirectWithError(request, stripeConfig.error);
  }

  if (!hasSupabaseAdminConfig()) {
    return redirectWithError(request, "Customer billing storage is not configured.");
  }

  const stripeCustomerId = await findStripeCustomerIdForEmail(getSupabaseAdmin() as BillingPortalDbClient, auth.session.email);
  if (!stripeCustomerId) {
    return redirectWithError(request, "No Stripe billing profile is connected to this account yet.");
  }

  try {
    const origin = new URL(request.url).origin;
    const siteUrl = getCheckoutSiteUrl(origin).replace(/\/+$/, "");
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/account/orders`
    });

    if (!session.url) {
      return redirectWithError(request, "Stripe billing portal could not be started.");
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch {
    return redirectWithError(request, "Stripe billing portal is not available yet.");
  }
}

async function findStripeCustomerIdForEmail(client: BillingPortalDbClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: customer } = await client.from("customers").select("id,email").eq("email", normalizedEmail).maybeSingle();
  const customerId = readString(customer?.id);

  if (customerId) {
    const { data: subscriptions } = await client
      .from("hosted_subscriptions")
      .select("stripe_customer_id,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5);
    const subscriptionCustomerId = firstStripeCustomerId(subscriptions);
    if (subscriptionCustomerId) return subscriptionCustomerId;
  }

  const { data: orders } = await client
    .from("orders")
    .select("customer_details_json,created_at")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(10);

  return firstStripeCustomerIdFromOrders(orders);
}

function firstStripeCustomerId(rows: unknown) {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    const id = readString(readRecord(row).stripe_customer_id);
    if (id) return id;
  }
  return null;
}

function firstStripeCustomerIdFromOrders(rows: unknown) {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    const details = readRecord(readRecord(row).customer_details_json);
    const id = readString(details.stripe_customer_id);
    if (id) return id;
  }
  return null;
}

function redirectWithError(request: Request, message: string) {
  const url = new URL("/account/orders", request.url);
  url.searchParams.set("billing_error", message);
  return NextResponse.redirect(url, { status: 303 });
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
