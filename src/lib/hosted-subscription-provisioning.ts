import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot, type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import type { OrderLineItem, OrderRecord, OrdersDbClient, StripeCheckoutSessionLike } from "@/lib/orders";

export type HostedSubscriptionStatus = "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "trialing" | "unknown";
export type HostedSubscriptionProvisioningStatus = "ready_for_customer_setup" | "provisioning_failed";

export type HostedSubscriptionProvisioningResult =
  | {
      ok: true;
      provisioned: boolean;
      code?: string;
      hostedPageUrl?: string;
      reason?: "not_hosted_checkout" | "duplicate_event";
    }
  | {
      ok: false;
      error: string;
    };

export type HostedSubscriptionProvisioningInput = {
  session: StripeCheckoutSessionLike;
  order: OrderRecord;
  eventId?: string;
  eventType?: string;
  now?: Date;
  siteUrl?: string;
};

export type HostedSubscriptionProvisioningDependencies = {
  client: OrdersDbClient;
  storage: HostedPageTextStorage;
  generateCode?: () => string;
};

type StripeSubscriptionLike = {
  id?: string | null;
  status?: string | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
};

export async function provisionHostedSubscriptionFromCheckout(
  input: HostedSubscriptionProvisioningInput,
  dependencies?: HostedSubscriptionProvisioningDependencies
): Promise<HostedSubscriptionProvisioningResult> {
  if (!isHostedSubscriptionCheckout(input.session, input.order)) {
    return { ok: true, provisioned: false, reason: "not_hosted_checkout" };
  }

  if (!input.session.id) {
    return { ok: false, error: "Stripe Checkout Session ID is required for hosted provisioning." };
  }

  const resolved = await resolveDependencies(dependencies);
  if (!resolved.ok) return resolved;

  const { client, storage } = resolved;
  const now = input.now ?? new Date();

  if (input.eventId) {
    const recorded = await recordStripeEventIfNew(client, input.eventId, input.eventType ?? "checkout.session.completed", now);
    if (!recorded.ok) return recorded;
    if (!recorded.created) return { ok: true, provisioned: false, reason: "duplicate_event" };
  }

  const email = normalizeEmail(input.session.customer_details?.email ?? input.session.customer_email ?? input.order.email);
  if (!email) return { ok: false, error: "Customer email is required for hosted provisioning." };

  const hostedItemIndex = input.order.line_items_json.findIndex((item) => getHostedLineItem(item));
  if (hostedItemIndex === -1) return { ok: false, error: "Paid order does not contain a hosted line item." };
  const hostedItem = input.order.line_items_json[hostedItemIndex];
  const setup = readSetup(hostedItem);
  const businessName = readString(setup.businessName) ?? input.order.customer_name ?? input.session.customer_details?.name ?? "Tap Rater Customer";
  const logoUrl = readString(setup.logoMediaUrl);
  const stripeSubscriptionId = readStripeId(input.session.subscription) ?? `checkout:${input.session.id}`;
  const stripeCustomerId = readStripeId(input.session.customer);
  const subscriptionStatus = readSubscriptionStatus(input.session.subscription);
  const lifecycleStatus = mapStripeSubscriptionLifecycle(input.session.subscription, now);
  const paidThrough = readCurrentPeriodEnd(input.session.subscription);

  const customer = await upsertCustomer(client, {
    email,
    name: input.session.customer_details?.name ?? input.order.customer_name ?? null,
    phone: input.session.customer_details?.phone ?? null,
    now
  });
  if (!customer.ok) return customer;

  const business = await createBusiness(client, {
    customerId: customer.customerId,
    businessName,
    logoUrl: logoUrl ?? null,
    now
  });
  if (!business.ok) return business;

  const physicalProductRef = buildPhysicalProductRef(input.order, input.session.id, hostedItemIndex);
  const assignment = await assignPermanentHostedPageCode(storage, {
    physicalProductRef,
    assignedBy: `stripe:${input.session.id}`,
    now,
    generateCode: dependencies?.generateCode
  });
  const hostedPageUrl = `${(input.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "")}/p/${assignment.code}`;
  const lineItems = attachHostedTargets(input.order.line_items_json, hostedItemIndex, assignment.code, hostedPageUrl, {
    stripeSubscriptionId,
    subscriptionStatus
  });

  const page = await upsertHostedEditorPage(client, {
    customerId: customer.customerId,
    businessId: business.businessId,
    code: assignment.code,
    lifecycleStatus,
    businessName,
    logoUrl: logoUrl ?? null,
    now
  });
  if (!page.ok) return page;

  const subscription = await upsertHostedSubscription(client, {
    customerId: customer.customerId,
    businessId: business.businessId,
    hostedPageId: page.pageId,
    orderId: input.order.id ?? null,
    stripeCheckoutSessionId: input.session.id,
    stripeCustomerId,
    stripeSubscriptionId,
    permanentCode: assignment.code,
    hostedPageUrl,
    status: subscriptionStatus,
    lifecycleStatus,
    currentPeriodEnd: paidThrough,
    cancelAtPeriodEnd: Boolean(readSubscriptionObject(input.session.subscription)?.cancel_at_period_end),
    provisioningStatus: "ready_for_customer_setup",
    now
  });
  if (!subscription.ok) return subscription;

  const orderUpdate = await client
    .from("orders")
    .update({
      line_items_json: lineItems,
      production_status: "ready_for_production",
      updated_at: now.toISOString()
    })
    .eq("stripe_checkout_session_id", input.session.id);
  if (orderUpdate.error) return { ok: false, error: orderUpdate.error.message };

  await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
    schemaVersion: 1,
    code: assignment.code,
    version: `provisioned-${now.getTime()}-${input.session.id}`,
    publishedAt: now.toISOString(),
    lifecycleStatus,
    businessName,
    logoUrl: logoUrl ?? undefined,
    headline: businessName,
    buttons: [],
    description: "This Tap Rater page is being set up.",
    appearance: { theme: "light", accentColor: "#0f766e" },
    subscriptionPaidThrough: paidThrough ?? undefined
  }));

  return { ok: true, provisioned: true, code: assignment.code, hostedPageUrl };
}

export function isHostedSubscriptionCheckout(session: StripeCheckoutSessionLike, order: Pick<OrderRecord, "line_items_json">) {
  const metadataIntent = session.metadata?.checkout_intent;
  return metadataIntent === "hosted_subscription" || order.line_items_json.some((item) => getHostedLineItem(item));
}

export function mapStripeSubscriptionLifecycle(subscription: unknown, now = new Date()): HostedPageLifecycleStatus {
  const value = readSubscriptionObject(subscription);
  const status = value?.status ?? "active";

  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "PAST_DUE";
  if (status === "canceled") return "EXPIRED";
  if (value?.cancel_at_period_end) return "CANCELLED_AT_PERIOD_END";
  if (status === "active" || status === "trialing") return "ACTIVE";
  return now.getTime() >= 0 ? "ACTIVE" : "ACTIVE";
}

async function resolveDependencies(dependencies?: HostedSubscriptionProvisioningDependencies) {
  if (dependencies) return { ok: true as const, ...dependencies };
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };

  const storage = await getHostedPageStorage();
  if (!storage) return { ok: false as const, error: "Hosted page snapshot storage is not configured." };

  return { ok: true as const, client: getSupabaseAdmin() as OrdersDbClient, storage };
}

async function recordStripeEventIfNew(client: OrdersDbClient, eventId: string, eventType: string, now: Date) {
  const existing = await client.from("stripe_events").select("id").eq("id", eventId).maybeSingle();
  if (existing.error) return { ok: false as const, error: existing.error.message };
  if (existing.data) return { ok: true as const, created: false };

  const inserted = await client.from("stripe_events").insert({
    id: eventId,
    type: eventType,
    processed_at: now.toISOString(),
    created_at: now.toISOString()
  });
  if (inserted.error) return { ok: false as const, error: inserted.error.message };
  return { ok: true as const, created: true };
}

async function upsertCustomer(client: OrdersDbClient, input: { email: string; name?: string | null; phone?: string | null; now: Date }) {
  const result = await client
    .from("customers")
    .upsert(
      {
        email: input.email,
        name: input.name ?? null,
        phone: input.phone ?? null,
        role: "customer",
        updated_at: input.now.toISOString()
      },
      { onConflict: "email" }
    )
    .select("id")
    .maybeSingle();
  if (result.error || !result.data?.id) return { ok: false as const, error: result.error?.message ?? "Customer could not be provisioned." };
  return { ok: true as const, customerId: String(result.data.id) };
}

async function createBusiness(client: OrdersDbClient, input: { customerId: string; businessName: string; logoUrl?: string | null; now: Date }) {
  const result = await client
    .from("businesses")
    .insert({
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

async function upsertHostedEditorPage(
  client: OrdersDbClient,
  input: { customerId: string; businessId: string; code: string; lifecycleStatus: HostedPageLifecycleStatus; businessName: string; logoUrl?: string | null; now: Date }
) {
  const draft = buildInitialDraft(input.businessName, input.logoUrl ?? undefined);
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

async function upsertHostedSubscription(
  client: OrdersDbClient,
  input: {
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
    cancelAtPeriodEnd: boolean;
    provisioningStatus: HostedSubscriptionProvisioningStatus;
    now: Date;
  }
) {
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
      cancel_at_period_end: input.cancelAtPeriodEnd,
      provisioning_status: input.provisioningStatus,
      updated_at: input.now.toISOString()
    },
    { onConflict: "stripe_checkout_session_id" }
  );
  if (result.error) return { ok: false as const, error: result.error.message };
  return { ok: true as const };
}

function attachHostedTargets(
  lineItems: OrderLineItem[],
  hostedItemIndex: number,
  code: string,
  hostedPageUrl: string,
  subscription: { stripeSubscriptionId: string; subscriptionStatus: HostedSubscriptionStatus }
) {
  return lineItems.map((item, index) => {
    if (index !== hostedItemIndex) return item;
    return {
      ...item,
      destinationMode: "HOSTED" as const,
      productionStatus: "ready_for_direct_fulfillment" as const,
      manualProductionRequired: false,
      productionWarningCodes: [],
      setup: {
        ...readSetup(item),
        permanentPageCode: code,
        hostedPageCode: code,
        hostedPageUrl,
        generatedQrValue: hostedPageUrl,
        qrTargetUrl: hostedPageUrl,
        nfcTargetUrl: hostedPageUrl,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        subscriptionStatus: subscription.subscriptionStatus,
        hasQr: true,
        nfcOnly: false
      }
    };
  });
}

function buildPhysicalProductRef(order: OrderRecord, checkoutSessionId: string, itemIndex: number) {
  return `stripe-checkout:${checkoutSessionId}:order:${order.id ?? "pending"}:line:${itemIndex + 1}`;
}

function buildInitialDraft(businessName: string, logoUrl?: string) {
  return {
    businessName,
    logoUrl,
    headline: businessName,
    description: "This Tap Rater page is being set up.",
    appearance: { theme: "light" as const, accentColor: "#0f766e" as const },
    buttons: []
  };
}

function getHostedLineItem(item: OrderLineItem) {
  return item.optionId === "hosted_multilink" || item.destinationMode === "HOSTED" ? item : null;
}

function readSetup(item: OrderLineItem) {
  return item.setup && typeof item.setup === "object" ? item.setup : {};
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" && value.includes("@") ? value.trim().toLowerCase() : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStripeId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "id" in value) return readString((value as { id?: unknown }).id);
  return undefined;
}

function readSubscriptionObject(value: unknown): StripeSubscriptionLike | null {
  return value && typeof value === "object" ? (value as StripeSubscriptionLike) : null;
}

function readSubscriptionStatus(value: unknown): HostedSubscriptionStatus {
  const status = readSubscriptionObject(value)?.status;
  return status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete" ||
    status === "trialing"
    ? status
    : "unknown";
}

function readCurrentPeriodEnd(value: unknown) {
  const epochSeconds = readSubscriptionObject(value)?.current_period_end;
  return typeof epochSeconds === "number" && Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000).toISOString() : null;
}
