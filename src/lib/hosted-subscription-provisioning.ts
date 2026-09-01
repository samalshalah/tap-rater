import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { createCustomerActivationToken } from "@/lib/customer-account";
import { sendCustomerAccountSetupEmail, sendHostedSetupEmail, type HostedSetupEmailInput } from "@/lib/hosted-setup-email";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot, type HostedPageButton, type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { supportedHostedPageButtons, type HostedPageEditorButton } from "@/lib/hosted-page-editor-shared";
import type { EmailResult } from "@/lib/email";
import type { OrderLineItem, OrderRecord, OrdersDbClient, StripeCheckoutSessionLike } from "@/lib/orders";

export type HostedSubscriptionStatus = "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "trialing" | "unknown";
export type HostedSubscriptionProvisioningStatus = "ready_for_customer_setup" | "provisioning_failed";

export type HostedSubscriptionProvisioningResult =
  | {
      ok: true;
      provisioned: boolean;
      code?: string;
      hostedPageUrl?: string;
      reason?: "not_hosted_checkout" | "duplicate_event" | "unpaid_checkout";
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

export type ManualCustomerAccountProvisioningInput = {
  order: OrderRecord;
  now?: Date;
  siteUrl?: string;
};

export type ManualCustomerAccountProvisioningResult =
  | {
      ok: true;
      accountProvisioned: boolean;
      hostedProvisioned: boolean;
      code?: string;
      hostedPageUrl?: string;
      reason?: "missing_customer_email";
    }
  | {
      ok: false;
      error: string;
    };

export type HostedSubscriptionProvisioningDependencies = {
  client: OrdersDbClient;
  storage: HostedPageTextStorage;
  generateCode?: () => string;
  sendHostedSetupEmailFn?: (input: HostedSetupEmailInput) => Promise<EmailResult>;
  sendCustomerAccountSetupEmailFn?: typeof sendCustomerAccountSetupEmail;
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

  if (input.session.payment_status !== "paid") {
    return { ok: true, provisioned: false, reason: "unpaid_checkout" };
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
  const initialButtons = readInitialMultiLinkButtons(setup.multiLinkButtons);
  const stripeSubscriptionId = readStripeId(input.session.subscription) ?? `checkout:${input.session.id}`;
  const stripeCustomerId = readStripeId(input.session.customer);
  const subscriptionStatus = readSubscriptionStatus(input.session.subscription);
  const lifecycleStatus = mapStripeSubscriptionLifecycle(input.session.subscription, now);
  const paidThrough = readCurrentPeriodEnd(input.session.subscription);
  const activation = createCustomerActivationToken();

  const customer = await upsertCustomer(client, {
    email,
    name: input.session.customer_details?.name ?? input.order.customer_name ?? null,
    phone: input.session.customer_details?.phone ?? null,
    activationTokenHash: activation.tokenHash,
    now
  });
  if (!customer.ok) return customer;

  const existingHostedSubscription = await findExistingHostedSubscriptionForCustomer(client, customer.customerId);
  const business = existingHostedSubscription
    ? { ok: true as const, businessId: existingHostedSubscription.business_id }
    : await createBusiness(client, {
        customerId: customer.customerId,
        businessName,
        logoUrl: logoUrl ?? null,
        now
      });
  if (!business.ok) return business;

  const assignment = existingHostedSubscription
    ? { code: existingHostedSubscription.permanent_code }
    : await assignPermanentHostedPageCode(storage, {
        physicalProductRef: buildPhysicalProductRef(input.order, input.session.id, hostedItemIndex),
        assignedBy: `stripe:${input.session.id}`,
        now,
        generateCode: dependencies?.generateCode
      });
  const hostedPageUrl =
    existingHostedSubscription?.hosted_page_url ?? `${(input.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "")}/p/${assignment.code}`;
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
    initialButtons,
    now
  });
  if (!page.ok) return page;

  const subscription = await upsertHostedSubscription(client, {
    existingSubscriptionId: existingHostedSubscription?.id,
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
    buttons: buildSnapshotButtons(initialButtons),
    description: initialButtons.length ? "Choose an option below." : "This Tap Rater page is being set up.",
    appearance: { theme: "light", accentColor: "#0f766e" },
    subscriptionPaidThrough: paidThrough ?? undefined
  }));

  const setupEmail = await (dependencies?.sendHostedSetupEmailFn ?? sendHostedSetupEmail)({
    to: email,
    businessName,
    hostedPageUrl,
    activationToken: activation.token
  });
  if (!setupEmail.sent) {
    console.warn("[hosted-provisioning] setup_email_not_sent", {
      stripeCheckoutSessionId: input.session.id,
      reason: setupEmail.reason
    });
  }

  return { ok: true, provisioned: true, code: assignment.code, hostedPageUrl };
}

export async function provisionManualCustomerAccountFromOrder(
  input: ManualCustomerAccountProvisioningInput,
  dependencies?: HostedSubscriptionProvisioningDependencies
): Promise<ManualCustomerAccountProvisioningResult> {
  const email = normalizeEmail(input.order.email);
  if (!email) {
    return { ok: true, accountProvisioned: false, hostedProvisioned: false, reason: "missing_customer_email" };
  }

  const resolved = await resolveClientDependency(dependencies);
  if (!resolved.ok) return resolved;

  const { client } = resolved;
  const now = input.now ?? new Date();
  const activation = createCustomerActivationToken();
  const customer = await upsertCustomer(client, {
    email,
    name: input.order.customer_name ?? null,
    phone: readCustomerPhone(input.order.customer_details_json),
    activationTokenHash: activation.tokenHash,
    now
  });
  if (!customer.ok) return customer;

  const hostedItemIndex = input.order.line_items_json.findIndex((item) => getHostedLineItem(item));
  const businessName = readManualOrderBusinessName(input.order);

  if (hostedItemIndex === -1) {
    const business = await createBusiness(client, {
      customerId: customer.customerId,
      businessName,
      logoUrl: readManualOrderLogoUrl(input.order),
      now
    });
    if (!business.ok) return business;

    const setupEmail = await (dependencies?.sendCustomerAccountSetupEmailFn ?? sendCustomerAccountSetupEmail)({
      to: email,
      businessName,
      orderReference: input.order.stripe_checkout_session_id,
      activationToken: activation.token
    });
    if (!setupEmail.sent) {
      console.warn("[manual-provisioning] account_email_not_sent", {
        orderReference: input.order.stripe_checkout_session_id,
        reason: setupEmail.reason
      });
    }

    return { ok: true, accountProvisioned: true, hostedProvisioned: false };
  }

  const storage = dependencies?.storage ?? await getHostedPageStorage();
  if (!storage) return { ok: false, error: "Hosted page snapshot storage is not configured." };

  const hostedItem = input.order.line_items_json[hostedItemIndex];
  const setup = readSetup(hostedItem);
  const logoUrl = readString(setup.logoMediaUrl) ?? readManualOrderLogoUrl(input.order);
  const initialButtons = readInitialMultiLinkButtons(setup.multiLinkButtons);
  const existingHostedSubscription = await findExistingHostedSubscriptionForCustomer(client, customer.customerId);
  const business = existingHostedSubscription
    ? { ok: true as const, businessId: existingHostedSubscription.business_id }
    : await createBusiness(client, {
        customerId: customer.customerId,
        businessName,
        logoUrl: logoUrl ?? null,
        now
      });
  if (!business.ok) return business;

  const assignment = existingHostedSubscription
    ? { code: existingHostedSubscription.permanent_code }
    : await assignPermanentHostedPageCode(storage, {
        physicalProductRef: buildPhysicalProductRef(input.order, input.order.stripe_checkout_session_id, hostedItemIndex),
        assignedBy: `manual:${input.order.stripe_checkout_session_id}`,
        now,
        generateCode: dependencies?.generateCode
      });
  const hostedPageUrl =
    existingHostedSubscription?.hosted_page_url ?? `${(input.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "")}/p/${assignment.code}`;
  const stripeSubscriptionId = `manual:${input.order.stripe_checkout_session_id}`;
  const lineItems = attachHostedTargets(input.order.line_items_json, hostedItemIndex, assignment.code, hostedPageUrl, {
    stripeSubscriptionId,
    subscriptionStatus: "unknown"
  });

  const page = await upsertHostedEditorPage(client, {
    customerId: customer.customerId,
    businessId: business.businessId,
    code: assignment.code,
    lifecycleStatus: "ACTIVE",
    businessName,
    logoUrl: logoUrl ?? null,
    initialButtons,
    now
  });
  if (!page.ok) return page;

  const subscription = await upsertHostedSubscription(client, {
    existingSubscriptionId: existingHostedSubscription?.id,
    customerId: customer.customerId,
    businessId: business.businessId,
    hostedPageId: page.pageId,
    orderId: input.order.id ?? null,
    stripeCheckoutSessionId: input.order.stripe_checkout_session_id,
    stripeCustomerId: null,
    stripeSubscriptionId,
    permanentCode: assignment.code,
    hostedPageUrl,
    status: "unknown",
    lifecycleStatus: "ACTIVE",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
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
    .eq("stripe_checkout_session_id", input.order.stripe_checkout_session_id);
  if (orderUpdate.error) return { ok: false, error: orderUpdate.error.message };

  await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
    schemaVersion: 1,
    code: assignment.code,
    version: `manual-${now.getTime()}-${input.order.stripe_checkout_session_id}`,
    publishedAt: now.toISOString(),
    lifecycleStatus: "ACTIVE",
    businessName,
    logoUrl: logoUrl ?? undefined,
    headline: businessName,
    buttons: buildSnapshotButtons(initialButtons),
    description: initialButtons.length ? "Choose an option below." : "This Tap Rater page is being set up.",
    appearance: { theme: "light", accentColor: "#0f766e" }
  }));

  const setupEmail = await (dependencies?.sendHostedSetupEmailFn ?? sendHostedSetupEmail)({
    to: email,
    businessName,
    hostedPageUrl,
    activationToken: activation.token
  });
  if (!setupEmail.sent) {
    console.warn("[manual-provisioning] hosted_setup_email_not_sent", {
      orderReference: input.order.stripe_checkout_session_id,
      reason: setupEmail.reason
    });
  }

  return { ok: true, accountProvisioned: true, hostedProvisioned: true, code: assignment.code, hostedPageUrl };
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

async function resolveClientDependency(dependencies?: Pick<HostedSubscriptionProvisioningDependencies, "client">) {
  if (dependencies?.client) return { ok: true as const, client: dependencies.client };
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return { ok: true as const, client: getSupabaseAdmin() as OrdersDbClient };
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

async function upsertCustomer(
  client: OrdersDbClient,
  input: { email: string; name?: string | null; phone?: string | null; activationTokenHash: string; now: Date }
) {
  const activationExpiresAt = new Date(input.now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const existing = await client.from("customers").select("id,account_status").eq("email", input.email).maybeSingle();
  const existingStatus = readString(existing.data?.account_status);
  const accountStatus = existingStatus === "active" ? "active" : "pending_activation";

  const result = await client
    .from("customers")
    .upsert(
      {
        email: input.email,
        name: input.name ?? null,
        phone: input.phone ?? null,
        role: "customer",
        account_status: accountStatus,
        activation_token_hash: input.activationTokenHash,
        activation_expires_at: activationExpiresAt,
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

async function upsertHostedSubscription(
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
        past_due_since: null,
        grace_ends_at: null,
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
      cancel_at_period_end: input.cancelAtPeriodEnd,
      provisioning_status: input.provisioningStatus,
      updated_at: input.now.toISOString()
    },
    { onConflict: "stripe_checkout_session_id" }
  );
  if (result.error) return { ok: false as const, error: result.error.message };
  return { ok: true as const };
}

async function findExistingHostedSubscriptionForCustomer(client: OrdersDbClient, customerId: string) {
  const result = await client
    .from("hosted_subscriptions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (result.error || !Array.isArray(result.data)) return null;
  return normalizeExistingHostedSubscription(result.data[0]);
}

function normalizeExistingHostedSubscription(row: unknown) {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const id = readString(value.id);
  const businessId = readString(value.business_id);
  const hostedPageId = readString(value.hosted_page_id);
  const permanentCode = readString(value.permanent_code);
  const hostedPageUrl = readString(value.hosted_page_url);
  if (!id || !businessId || !hostedPageId || !permanentCode || !hostedPageUrl) return null;
  return {
    id,
    business_id: businessId,
    hosted_page_id: hostedPageId,
    permanent_code: permanentCode,
    hosted_page_url: hostedPageUrl
  };
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

function readManualOrderBusinessName(order: OrderRecord) {
  for (const item of order.line_items_json) {
    const businessName = readString(readSetup(item).businessName);
    if (businessName) return businessName;
  }

  return order.customer_name ?? normalizeEmail(order.email) ?? "Tap Rater Customer";
}

function readManualOrderLogoUrl(order: OrderRecord) {
  for (const item of order.line_items_json) {
    const setup = readSetup(item);
    const logoUrl = readString(setup.logoMediaUrl);
    if (logoUrl) return logoUrl;
  }

  return null;
}

function readCustomerPhone(value: unknown) {
  return value && typeof value === "object" ? readString((value as Record<string, unknown>).phone) ?? null : null;
}

function buildInitialDraft(businessName: string, logoUrl?: string, buttons: HostedPageEditorButton[] = []) {
  return {
    businessName,
    logoUrl,
    headline: businessName,
    description: buttons.length ? "Choose an option below." : "This Tap Rater page is being set up.",
    appearance: { theme: "light" as const, accentColor: "#0f766e" as const },
    buttons
  };
}

function readInitialMultiLinkButtons(value: unknown): HostedPageEditorButton[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index): HostedPageEditorButton[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = readString(row.id);
    const type = readEditorButtonType(row.type);
    const label = readString(row.label);
    const url = readString(row.url);
    if (!id || !type || !label || !url || !isHttpUrl(url)) return [];

    return [
      {
        id,
        type,
        label,
        url,
        enabled: row.enabled !== false,
        position: Number.isInteger(row.position) ? Number(row.position) : index
      }
    ];
  }).slice(0, 10).map((button, index) => ({ ...button, position: index }));
}

function buildSnapshotButtons(buttons: HostedPageEditorButton[]): HostedPageButton[] {
  return buttons
    .filter((button) => button.enabled)
    .map((button) => ({
      id: button.id,
      label: button.label,
      type: supportedHostedPageButtons.find((item) => item.type === button.type)?.snapshotType ?? "website",
      url: button.url,
      isVisible: true
    }));
}

function readEditorButtonType(value: unknown) {
  return typeof value === "string" && supportedHostedPageButtons.some((button) => button.type === value) ? value as HostedPageEditorButton["type"] : undefined;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
