import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { findStripeCustomerIdForEmail, type CustomerBillingDbClient } from "@/lib/customer-billing";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getCheckoutSiteUrl, getStripeClient, validateStripeRuntimeConfig } from "@/lib/checkout";

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

  const subscriptionSelection = await readSubscriptionSelection(request);
  if (!subscriptionSelection.ok) {
    return redirectWithError(request, "The selected billing profile is invalid.");
  }

  const stripeCustomerId = await findStripeCustomerIdForEmail(
    getSupabaseAdmin() as CustomerBillingDbClient,
    auth.session.email,
    { stripeMode: stripeConfig.mode, subscriptionId: subscriptionSelection.subscriptionId }
  );
  if (!stripeCustomerId) {
    return redirectWithError(
      request,
      subscriptionSelection.subscriptionId
        ? "That subscription does not have a billing profile connected to this account."
        : "No Stripe billing profile is connected to this account yet."
    );
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

async function readSubscriptionSelection(request: Request): Promise<
  { ok: true; subscriptionId: string | null } | { ok: false }
> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return { ok: true, subscriptionId: null };
  }

  try {
    const value = (await request.formData()).get("subscription_id");
    if (value === null) return { ok: true, subscriptionId: null };
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) return { ok: false };
    return { ok: true, subscriptionId: value };
  } catch {
    return { ok: false };
  }
}

function redirectWithError(request: Request, message: string) {
  const url = new URL("/account/orders", request.url);
  url.searchParams.set("billing_error", message);
  return NextResponse.redirect(url, { status: 303 });
}
