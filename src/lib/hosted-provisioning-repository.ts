import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { customerActivationTtlMs } from "@/lib/customer-account";
import { type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { type HostedPageEditorButton } from "@/lib/hosted-page-editor-shared";
import type { OrderLineItem, OrdersDbClient } from "@/lib/orders";
import { getStripeClient } from "@/lib/checkout";
import { createHash } from "node:crypto";
import { hostedSubscriptionGracePeriodDays } from "@/lib/hosted-subscription-lifecycle";
import { decryptCommerceData, encryptCommerceData } from "@/lib/commerce-encryption";
import { getPaidBrandedHostedReservation } from "@/lib/branded-proof";
import { type HostedSubscriptionStatus, type HostedSubscriptionProvisioningStatus, type HostedSubscriptionProvisioningDependencies, type ExistingHostedSubscriptionMatch } from "./hosted-provisioning-types";
import { normalizeExistingHostedSubscription, attachHostedTargets, buildInitialDraft, getHostedLineItemIndexes, readString, resolveHostedPageUrl } from "./hosted-provisioning-model";

export async function repairHostedOrderTargets(client: OrdersDbClient, checkoutSessionId: string, siteUrl: string, storage: HostedPageTextStorage) {
  const lookup = await client.from("orders").select("*").eq("stripe_checkout_session_id", checkoutSessionId).maybeSingle();
  if (lookup.error || !lookup.data) throw new Error(lookup.error?.message ?? "Provisioned order is missing.");
  if (lookup.data.payment_status?.includes("refund") || lookup.data.stripe_refund_id) return;
  const original = lookup.data.line_items_json as OrderLineItem[];
  let lineItems = original;
  const indexes = getHostedLineItemIndexes(lineItems);
  for (const index of indexes) {
    const lineSessionId = indexes.length > 1 ? `${checkoutSessionId}:line:${index + 1}` : checkoutSessionId;
    const subscription = await client.from("hosted_subscriptions").select("*").eq("stripe_checkout_session_id", lineSessionId).maybeSingle();
    if (subscription.error || !subscription.data) throw new Error(subscription.error?.message ?? "Provisioned subscription is missing.");
    const row = subscription.data;
    const reservation = await getPaidBrandedHostedReservation(lineItems[index], checkoutSessionId, storage);
    if (reservation && reservation.code !== row.permanent_code) throw new Error("Provisioned page does not match the approved artwork destination.");
    const url = reservation?.url ?? resolveHostedPageUrl(row.hosted_page_url, siteUrl, row.permanent_code);
    if (url !== row.hosted_page_url) {
      const update = await client.from("hosted_subscriptions").update({ hosted_page_url: url }).eq("id", row.id);
      if (update.error) throw new Error(update.error.message);
    }
    lineItems = attachHostedTargets(lineItems, index, row.permanent_code, url, { stripeSubscriptionId: row.stripe_subscription_id, subscriptionStatus: row.status });
  }
  if (JSON.stringify(original) !== JSON.stringify(lineItems)) {
    const update = await client.from("orders").update({ line_items_json: lineItems }).eq("stripe_checkout_session_id", checkoutSessionId)
      .eq("payment_status", lookup.data.payment_status ?? null).eq("stripe_refund_id", lookup.data.stripe_refund_id ?? null);
    if (update.error) throw new Error(update.error.message);
  }
}

export async function resolveDependencies(dependencies?: HostedSubscriptionProvisioningDependencies) {
  if (dependencies) return { ok: true as const, ...dependencies };
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };

  const storage = await getHostedPageStorage();
  if (!storage) return { ok: false as const, error: "Hosted page snapshot storage is not configured." };

  return {
    ok: true as const, client: getSupabaseAdmin() as OrdersDbClient, storage,
    retrieveSubscription: (id: string) => getStripeClient().subscriptions.retrieve(id),
  };
}

export async function resolveClientDependency(dependencies?: Pick<HostedSubscriptionProvisioningDependencies, "client">) {
  if (dependencies?.client) return { ok: true as const, client: dependencies.client };
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return { ok: true as const, client: getSupabaseAdmin() as OrdersDbClient };
}

export async function upsertCustomer(
  client: OrdersDbClient,
  input: { email: string; name?: string | null; phone?: string | null; activationTokenHash: string; activationToken?: string; now: Date }
) {
  const activationExpiresAt = new Date(input.now.getTime() + customerActivationTtlMs).toISOString();
  const existing = await client.from("customers").select("id,account_status,activation_token_hash,activation_expires_at,activation_token_ciphertext").eq("email", input.email).maybeSingle();
  if (existing.error) return { ok: false as const, error: "Customer lookup failed." };
  const existingStatus = readString(existing.data?.account_status);
  if (existingStatus === "disabled") return { ok: false as const, error: "Customer account is disabled. Staff review is required." };
  const wasAlreadyActive = existingStatus === "active";
  if (wasAlreadyActive) {
    if (existing.data.activation_token_hash || existing.data.activation_token_ciphertext) {
      const cleared = await client.from("customers").update({ activation_token_hash: null, activation_expires_at: null, activation_token_ciphertext: null })
        .eq("id", existing.data.id).eq("account_status", "active").select("id").maybeSingle();
      if (cleared.error || !cleared.data) return { ok: false as const, error: "Active customer changed during recovery." };
    }
    return { ok: true as const, customerId: String(existing.data.id), wasAlreadyActive: true, activationPending: false, activationToken: undefined };
  }
  if (input.activationToken && existing.data?.activation_token_hash && Date.parse(existing.data.activation_expires_at) <= input.now.getTime()) {
    return { ok: false as const, error: "Activation has expired. Resend activation from Customers before retrying." };
  }
  if (input.activationToken && existing.data?.activation_token_hash && Date.parse(existing.data.activation_expires_at) > input.now.getTime()) {
    const token = existing.data.activation_token_ciphertext
      ? decryptCommerceData<string>(existing.data.activation_token_ciphertext, `activation:${input.email}`) : undefined;
    const matches = token && createHash("sha256").update(token).digest("hex") === existing.data.activation_token_hash;
    return { ok: true as const, customerId: String(existing.data.id), wasAlreadyActive: false, activationPending: !matches, activationToken: matches ? token : undefined };
  }
  const accountStatus = wasAlreadyActive ? "active" : "pending_activation";
  const activationFields = wasAlreadyActive
    ? {
      activation_token_hash: null,
      activation_expires_at: null
    }
    : {
      activation_token_hash: input.activationTokenHash,
      activation_expires_at: activationExpiresAt,
      activation_token_ciphertext: input.activationToken ? encryptCommerceData(input.activationToken, `activation:${input.email}`) : null
    };

  const values = {
        email: input.email,
        name: input.name ?? null,
        phone: input.phone ?? null,
        role: "customer",
        account_status: accountStatus,
        ...activationFields,
        updated_at: input.now.toISOString()
      };
  const query = existing.data
    ? client.from("customers").update(values).eq("id", existing.data.id).eq("account_status", existing.data.account_status)
      .eq("activation_token_hash", existing.data.activation_token_hash ?? null)
    : client.from("customers").insert(values);
  const result = await query
    .select("id")
    .maybeSingle();
  if (result.error || !result.data?.id) return { ok: false as const, error: result.error?.message ?? "Customer could not be provisioned." };
  return { ok: true as const, customerId: String(result.data.id), wasAlreadyActive, activationPending: false, activationToken: input.activationToken };
}

export async function createBusiness(client: OrdersDbClient, input: { id?: string; customerId: string; businessName: string; logoUrl?: string | null; now: Date }) {
  if (input.id) {
    const existing = await client.from("businesses").select("id,customer_id").eq("id", input.id).maybeSingle();
    if (existing.error) return { ok: false as const, error: existing.error.message };
    if (existing.data) return existing.data.customer_id === input.customerId
      ? { ok: true as const, businessId: input.id } : { ok: false as const, error: "Provisioning business ownership does not match." };
  }
  const result = await client
    .from("businesses")
    .insert({
      ...(input.id ? { id: input.id } : {}),
      customer_id: input.customerId,
      business_name: input.businessName,
      logo_url: input.logoUrl ?? null,
      status: "active",
      created_at: input.now.toISOString(),
      updated_at: input.now.toISOString()
    })
    .select("id")
    .maybeSingle();
  if (result.error || !result.data?.id) return { ok: false as const, error: result.error?.message ?? "Business could not be provisioned." };
  return { ok: true as const, businessId: String(result.data.id) };
}

export async function updateBusiness(
  client: OrdersDbClient,
  input: { businessId: string; customerId: string; businessName: string; logoUrl?: string | null; now: Date }
) {
  const result = await client
    .from("businesses")
    .update({
      business_name: input.businessName,
      logo_url: input.logoUrl ?? null,
      status: "active",
      updated_at: input.now.toISOString()
    })
    .eq("id", input.businessId)
    .eq("customer_id", input.customerId);
  if (result.error) return { ok: false as const, error: result.error.message };
  return { ok: true as const, businessId: input.businessId };
}

export async function upsertHostedEditorPage(
  client: OrdersDbClient,
  input: { customerId: string; businessId: string; code: string; lifecycleStatus: HostedPageLifecycleStatus; businessName: string; logoUrl?: string | null; initialButtons?: HostedPageEditorButton[]; now: Date }
) {
  const draft = buildInitialDraft(input.businessName, input.logoUrl ?? undefined, input.initialButtons ?? []);
  const result = await client
    .from("hosted_page_editor_pages")
    .upsert(
      {
        customer_id: input.customerId,
        business_id: input.businessId,
        code: input.code,
        lifecycle_status: input.lifecycleStatus,
        draft_json: draft,
        updated_at: input.now.toISOString()
      },
      { onConflict: "code" }
    )
    .select("id")
    .maybeSingle();
  if (result.error || !result.data?.id) return { ok: false as const, error: result.error?.message ?? "Hosted page editor record could not be provisioned." };
  return { ok: true as const, pageId: String(result.data.id) };
}

export async function upsertHostedPageCode(
  client: OrdersDbClient,
  input: { code: string; physicalProductRef: string; assignedBy: string; assignedAt: string }
) {
  const result = await client.from("hosted_page_codes").upsert(
    {
      code: input.code,
      physical_product_ref: input.physicalProductRef,
      assigned_by: input.assignedBy,
      assigned_at: input.assignedAt
    },
    { onConflict: "code" }
  );

  return result.error ? { ok: false as const, error: result.error.message } : { ok: true as const };
}

export async function upsertHostedSubscription(
  client: OrdersDbClient,
  input: {
    existingSubscriptionId?: string;
    customerId: string;
    businessId: string;
    hostedPageId: string;
    orderId: string | null;
    stripeCheckoutSessionId: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId: string;
    permanentCode: string;
    hostedPageUrl: string;
    status: HostedSubscriptionStatus;
    lifecycleStatus: HostedPageLifecycleStatus;
    currentPeriodEnd?: string | null;
    pastDueSince?: string | null;
    cancelAtPeriodEnd: boolean;
    provisioningStatus: HostedSubscriptionProvisioningStatus;
    now: Date;
  }
) {
  if (input.existingSubscriptionId) {
    const result = await client
      .from("hosted_subscriptions")
      .update({
        business_id: input.businessId,
        hosted_page_id: input.hostedPageId,
        order_id: input.orderId,
        stripe_checkout_session_id: input.stripeCheckoutSessionId,
        stripe_customer_id: input.stripeCustomerId ?? null,
        stripe_subscription_id: input.stripeSubscriptionId,
        hosted_page_url: input.hostedPageUrl,
        status: input.status,
        lifecycle_status: input.lifecycleStatus,
        current_period_end: input.currentPeriodEnd ?? null,
        cancel_at_period_end: input.cancelAtPeriodEnd,
        past_due_since: input.pastDueSince ?? null,
        grace_ends_at: input.pastDueSince ? new Date(Date.parse(input.pastDueSince) + hostedSubscriptionGracePeriodDays * 86_400_000).toISOString() : null,
        provisioning_status: input.provisioningStatus,
        provisioning_error: null,
        updated_at: input.now.toISOString()
      })
      .eq("id", input.existingSubscriptionId);
    if (result.error) return { ok: false as const, error: result.error.message };
    return { ok: true as const };
  }

  const result = await client.from("hosted_subscriptions").upsert(
    {
      customer_id: input.customerId,
      business_id: input.businessId,
      hosted_page_id: input.hostedPageId,
      order_id: input.orderId,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId,
      permanent_code: input.permanentCode,
      hosted_page_url: input.hostedPageUrl,
      status: input.status,
      lifecycle_status: input.lifecycleStatus,
      current_period_end: input.currentPeriodEnd ?? null,
      past_due_since: input.pastDueSince ?? null,
      grace_ends_at: input.pastDueSince ? new Date(Date.parse(input.pastDueSince) + hostedSubscriptionGracePeriodDays * 86_400_000).toISOString() : null,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      provisioning_status: input.provisioningStatus,
      updated_at: input.now.toISOString()
    },
    { onConflict: "stripe_checkout_session_id" }
  );
  if (result.error) return { ok: false as const, error: result.error.message };
  return { ok: true as const };
}

export async function findHostedSubscriptionForProvisioning(
  client: OrdersDbClient,
  input: { customerId: string; checkoutSessionId: string; allowExpiredCustomerPageReuse: boolean }
): Promise<{ ok: true; match: ExistingHostedSubscriptionMatch | null } | { ok: false; error: string }> {
  const checkoutResult = await client
    .from("hosted_subscriptions")
    .select("*")
    .eq("stripe_checkout_session_id", input.checkoutSessionId)
    .maybeSingle();
  if (checkoutResult.error) return { ok: false, error: checkoutResult.error.message };

  const checkoutSubscription = normalizeExistingHostedSubscription(checkoutResult.data);
  if (checkoutSubscription) {
    return { ok: true, match: { subscription: checkoutSubscription, reason: "checkout_session" } };
  }

  if (!input.allowExpiredCustomerPageReuse) return { ok: true, match: null };

  const expiredResult = await client
    .from("hosted_subscriptions")
    .select("*")
    .eq("customer_id", input.customerId)
    .eq("lifecycle_status", "EXPIRED")
    .order("created_at", { ascending: false })
    .limit(1);
  if (expiredResult.error) return { ok: false, error: expiredResult.error.message };
  if (!Array.isArray(expiredResult.data)) return { ok: true, match: null };

  const expiredSubscription = normalizeExistingHostedSubscription(expiredResult.data[0]);
  return {
    ok: true,
    match: expiredSubscription ? { subscription: expiredSubscription, reason: "expired_customer_page" } : null
  };
}
