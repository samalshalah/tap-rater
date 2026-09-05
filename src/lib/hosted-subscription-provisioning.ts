import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { createCustomerActivationToken, customerActivationTtlMs } from "@/lib/customer-account";
import {
  sendCustomerAccountSetupEmail,
  sendHostedAccountReadyEmail,
  sendHostedSetupEmail,
  sendPaidCustomerAccountSetupEmail,
  type HostedSetupEmailInput
} from "@/lib/hosted-setup-email";
import {
  assignPermanentHostedPageCode,
  publishHostedPageSnapshot,
  readCurrentHostedPageSnapshot,
  type HostedPageTextStorage
} from "@/lib/hosted-pages/repository";
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

export type PaidCustomerAccountProvisioningResult =
  | {
      ok: true;
      accountProvisioned: boolean;
      reason?: "missing_customer_email" | "account_not_requested" | "hosted_order" | "account_already_active";
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
  sendHostedAccountReadyEmailFn?: typeof sendHostedAccountReadyEmail;
  sendCustomerAccountSetupEmailFn?: typeof sendCustomerAccountSetupEmail;
  sendPaidCustomerAccountSetupEmailFn?: typeof sendPaidCustomerAccountSetupEmail;
};

type StripeSubscriptionLike = {
  id?: string | null;
  status?: string | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
};

type ExistingHostedSubscription = {
  id: string;
  business_id: string;
  hosted_page_id: string;
  permanent_code: string;
  hosted_page_url: string;
  updated_at?: string;
};

type ExistingHostedSubscriptionMatch = {
  subscription: ExistingHostedSubscription;
  reason: "checkout_session" | "expired_customer_page";
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
  const publicSiteUrl = resolvePublicSiteUrl(input.siteUrl);
  let duplicateEvent = false;

  if (input.eventId) {
    const recorded = await recordStripeEventIfNew(client, input.eventId, input.eventType ?? "checkout.session.completed", now);
    if (!recorded.ok) return recorded;
    duplicateEvent = !recorded.created;
  }

  const email = normalizeEmail(input.session.customer_details?.email ?? input.session.customer_email ?? input.order.email);
  if (!email) return { ok: false, error: "Customer email is required for hosted provisioning." };

  const hostedItemIndexes = getHostedLineItemIndexes(input.order.line_items_json);
  if (!hostedItemIndexes.length) return { ok: false, error: "Paid order does not contain a hosted line item." };
  const stripeSubscriptionId = readStripeId(input.session.subscription) ?? `checkout:${input.session.id}`;
  const stripeCustomerId = readStripeId(input.session.customer);
  const readStatus = readSubscriptionStatus(input.session.subscription);
  const subscriptionStatus = readStatus === "unknown" ? "active" : readStatus;
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

  let lineItems = input.order.line_items_json;
  let firstHostedPage: { code: string; hostedPageUrl: string; businessName: string } | null = null;
  const shouldReuseExistingCustomerPage = hostedItemIndexes.length === 1;

  for (const hostedItemIndex of hostedItemIndexes) {
    const hostedItem = input.order.line_items_json[hostedItemIndex];
    const setup = readSetup(hostedItem);
    const businessName = readString(setup.businessName) ?? input.order.customer_name ?? input.session.customer_details?.name ?? "Tap Rater Customer";
    const logoUrl = resolvePublicAssetUrl(readString(setup.logoMediaUrl), publicSiteUrl);
    const initialButtons = readInitialMultiLinkButtons(setup.multiLinkButtons);
    const lineSessionId = hostedItemIndexes.length > 1 ? `${input.session.id}:line:${hostedItemIndex + 1}` : input.session.id;
    const existingMatch = await findHostedSubscriptionForProvisioning(client, {
      customerId: customer.customerId,
      checkoutSessionId: lineSessionId,
      allowExpiredCustomerPageReuse: shouldReuseExistingCustomerPage
    });
    if (!existingMatch.ok) return existingMatch;
    const existingHostedSubscription = existingMatch.match?.subscription ?? null;
    const lineSubscriptionId = stripeSubscriptionId;
    const physicalProductRef = buildPhysicalProductRef(input.order, input.session.id, hostedItemIndex);
    const business = existingMatch.match?.reason === "expired_customer_page"
      ? await updateBusiness(client, {
          businessId: existingHostedSubscription!.business_id,
          customerId: customer.customerId,
          businessName,
          logoUrl: logoUrl ?? null,
          now
        })
      : existingHostedSubscription
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
          physicalProductRef,
          assignedBy: `stripe:${input.session.id}`,
          now,
          generateCode: dependencies?.generateCode
        });
    const hostedPageUrl = resolveHostedPageUrl(existingHostedSubscription?.hosted_page_url, publicSiteUrl, assignment.code);
    lineItems = attachHostedTargets(lineItems, hostedItemIndex, assignment.code, hostedPageUrl, {
      stripeSubscriptionId: lineSubscriptionId,
      subscriptionStatus
    });
    const hostedPageCode = await upsertHostedPageCode(client, {
      code: assignment.code,
      physicalProductRef,
      assignedBy: `stripe:${input.session.id}`,
      assignedAt: now.toISOString()
    });
    if (!hostedPageCode.ok) return hostedPageCode;

    const page = existingMatch.match?.reason === "checkout_session"
      ? { ok: true as const, pageId: existingHostedSubscription!.hosted_page_id }
      : await upsertHostedEditorPage(client, {
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
      stripeCheckoutSessionId: lineSessionId,
      stripeCustomerId,
      stripeSubscriptionId: lineSubscriptionId,
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

    const publishedPage = duplicateEvent ? await readCurrentHostedPageSnapshot(storage, assignment.code) : null;
    if (!publishedPage || snapshotPredatesProvisioning(publishedPage.publishedAt, existingHostedSubscription?.updated_at)) {
      await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
        schemaVersion: 1,
        code: assignment.code,
        version: buildProvisioningSnapshotVersion(now, input.session.id, hostedItemIndex, duplicateEvent),
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
    }

    firstHostedPage ??= { code: assignment.code, hostedPageUrl, businessName };
  }

  const orderUpdate = await client
    .from("orders")
    .update({
      line_items_json: lineItems,
      production_status: "ready_for_production",
      updated_at: now.toISOString()
    })
    .eq("stripe_checkout_session_id", input.session.id);
  if (orderUpdate.error) return { ok: false, error: orderUpdate.error.message };

  if (!duplicateEvent) {
    const setupEmail = customer.wasAlreadyActive
      ? await (dependencies?.sendHostedAccountReadyEmailFn ?? sendHostedAccountReadyEmail)({
          to: email,
          businessName: firstHostedPage?.businessName ?? input.order.customer_name ?? "Tap Rater Customer",
          hostedPageUrl: firstHostedPage?.hostedPageUrl ?? `${publicSiteUrl}/account`
        })
      : await (dependencies?.sendHostedSetupEmailFn ?? sendHostedSetupEmail)({
          to: email,
          businessName: firstHostedPage?.businessName ?? input.order.customer_name ?? "Tap Rater Customer",
          hostedPageUrl: firstHostedPage?.hostedPageUrl ?? `${publicSiteUrl}/account`,
          activationToken: activation.token
        });
    if (!setupEmail.sent) {
      console.warn("[hosted-provisioning] setup_email_not_sent", {
        stripeCheckoutSessionId: input.session.id,
        reason: setupEmail.reason
      });
    }
  }

  if (duplicateEvent) {
    return { ok: true, provisioned: false, reason: "duplicate_event" };
  }

  return { ok: true, provisioned: true, code: firstHostedPage?.code, hostedPageUrl: firstHostedPage?.hostedPageUrl };
}

export async function provisionManualCustomerAccountFromOrder(
  input: ManualCustomerAccountProvisioningInput,
  dependencies?: HostedSubscriptionProvisioningDependencies
): Promise<ManualCustomerAccountProvisioningResult> {
  const email = normalizeEmail(input.order.email ?? "");
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

  const hostedItemIndexes = getHostedLineItemIndexes(input.order.line_items_json);
  const businessName = readManualOrderBusinessName(input.order);

  if (!hostedItemIndexes.length) {
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

  let lineItems = input.order.line_items_json;
  let firstHostedPage: { code: string; hostedPageUrl: string; businessName: string } | null = null;
  const shouldReuseExistingCustomerPage = hostedItemIndexes.length === 1;
  const publicSiteUrl = resolvePublicSiteUrl(input.siteUrl);

  for (const hostedItemIndex of hostedItemIndexes) {
    const hostedItem = input.order.line_items_json[hostedItemIndex];
    const setup = readSetup(hostedItem);
    const itemBusinessName = readString(setup.businessName) ?? businessName;
    const logoUrl = resolvePublicAssetUrl(readString(setup.logoMediaUrl) ?? readManualOrderLogoUrl(input.order) ?? undefined, publicSiteUrl);
    const initialButtons = readInitialMultiLinkButtons(setup.multiLinkButtons);
    const lineSessionId = hostedItemIndexes.length > 1 ? `${input.order.stripe_checkout_session_id}:line:${hostedItemIndex + 1}` : input.order.stripe_checkout_session_id;
    const existingMatch = await findHostedSubscriptionForProvisioning(client, {
      customerId: customer.customerId,
      checkoutSessionId: lineSessionId,
      allowExpiredCustomerPageReuse: shouldReuseExistingCustomerPage
    });
    if (!existingMatch.ok) return existingMatch;
    const existingHostedSubscription = existingMatch.match?.subscription ?? null;
    const stripeSubscriptionId = `manual:${lineSessionId}`;
    const physicalProductRef = buildPhysicalProductRef(input.order, input.order.stripe_checkout_session_id, hostedItemIndex);
    const business = existingMatch.match?.reason === "expired_customer_page"
      ? await updateBusiness(client, {
          businessId: existingHostedSubscription!.business_id,
          customerId: customer.customerId,
          businessName: itemBusinessName,
          logoUrl: logoUrl ?? null,
          now
        })
      : existingHostedSubscription
        ? { ok: true as const, businessId: existingHostedSubscription.business_id }
        : await createBusiness(client, {
          customerId: customer.customerId,
          businessName: itemBusinessName,
          logoUrl: logoUrl ?? null,
          now
        });
    if (!business.ok) return business;

    const assignment = existingHostedSubscription
      ? { code: existingHostedSubscription.permanent_code }
      : await assignPermanentHostedPageCode(storage, {
          physicalProductRef,
          assignedBy: `manual:${input.order.stripe_checkout_session_id}`,
          now,
          generateCode: dependencies?.generateCode
        });
    const hostedPageUrl = existingHostedSubscription?.hosted_page_url ?? `${publicSiteUrl}/p/${assignment.code}`;
    lineItems = attachHostedTargets(lineItems, hostedItemIndex, assignment.code, hostedPageUrl, {
      stripeSubscriptionId,
      subscriptionStatus: "unknown"
    });
    const hostedPageCode = await upsertHostedPageCode(client, {
      code: assignment.code,
      physicalProductRef,
      assignedBy: `manual:${input.order.stripe_checkout_session_id}`,
      assignedAt: now.toISOString()
    });
    if (!hostedPageCode.ok) return hostedPageCode;

    const page = existingMatch.match?.reason === "checkout_session"
      ? { ok: true as const, pageId: existingHostedSubscription!.hosted_page_id }
      : await upsertHostedEditorPage(client, {
          customerId: customer.customerId,
          businessId: business.businessId,
          code: assignment.code,
          lifecycleStatus: "ACTIVE",
          businessName: itemBusinessName,
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
      stripeCheckoutSessionId: lineSessionId,
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

    await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
      schemaVersion: 1,
      code: assignment.code,
      version: `manual-${now.getTime()}-${input.order.stripe_checkout_session_id}-line-${hostedItemIndex + 1}`,
      publishedAt: now.toISOString(),
      lifecycleStatus: "ACTIVE",
      businessName: itemBusinessName,
      logoUrl: logoUrl ?? undefined,
      headline: itemBusinessName,
      buttons: buildSnapshotButtons(initialButtons),
      description: initialButtons.length ? "Choose an option below." : "This Tap Rater page is being set up.",
      appearance: { theme: "light", accentColor: "#0f766e" }
    }));

    firstHostedPage ??= { code: assignment.code, hostedPageUrl, businessName: itemBusinessName };
  }

  const orderUpdate = await client
    .from("orders")
    .update({
      line_items_json: lineItems,
      production_status: "ready_for_production",
      updated_at: now.toISOString()
    })
    .eq("stripe_checkout_session_id", input.order.stripe_checkout_session_id);
  if (orderUpdate.error) return { ok: false, error: orderUpdate.error.message };

  const setupEmail = customer.wasAlreadyActive
    ? await (dependencies?.sendHostedAccountReadyEmailFn ?? sendHostedAccountReadyEmail)({
        to: email,
        businessName: firstHostedPage?.businessName ?? businessName,
        hostedPageUrl: firstHostedPage?.hostedPageUrl ?? `${(input.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "")}/account`
      })
    : await (dependencies?.sendHostedSetupEmailFn ?? sendHostedSetupEmail)({
        to: email,
        businessName: firstHostedPage?.businessName ?? businessName,
        hostedPageUrl: firstHostedPage?.hostedPageUrl ?? `${(input.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "")}/account`,
        activationToken: activation.token
      });
  if (!setupEmail.sent) {
    console.warn("[manual-provisioning] hosted_setup_email_not_sent", {
      orderReference: input.order.stripe_checkout_session_id,
      reason: setupEmail.reason
    });
  }

  return { ok: true, accountProvisioned: true, hostedProvisioned: true, code: firstHostedPage?.code, hostedPageUrl: firstHostedPage?.hostedPageUrl };
}

export async function provisionPaidCustomerAccountFromOrder(
  input: ManualCustomerAccountProvisioningInput,
  dependencies?: HostedSubscriptionProvisioningDependencies
): Promise<PaidCustomerAccountProvisioningResult> {
  if (getHostedLineItemIndexes(input.order.line_items_json).length) {
    return { ok: true, accountProvisioned: false, reason: "hosted_order" };
  }

  if (!orderRequestsAccount(input.order)) {
    return { ok: true, accountProvisioned: false, reason: "account_not_requested" };
  }

  const email = normalizeEmail(input.order.email ?? "");
  if (!email) {
    return { ok: true, accountProvisioned: false, reason: "missing_customer_email" };
  }

  const resolved = await resolveClientDependency(dependencies);
  if (!resolved.ok) return resolved;

  const { client } = resolved;
  const now = input.now ?? new Date();
  const activation = createCustomerActivationToken();
  const businessName = readManualOrderBusinessName(input.order);
  const customer = await upsertCustomer(client, {
    email,
    name: input.order.customer_name ?? null,
    phone: readCustomerPhone(input.order.customer_details_json),
    activationTokenHash: activation.tokenHash,
    now
  });
  if (!customer.ok) return customer;

  const business = await createBusiness(client, {
    customerId: customer.customerId,
    businessName,
    logoUrl: readManualOrderLogoUrl(input.order),
    now
  });
  if (!business.ok) return business;

  if (customer.wasAlreadyActive) {
    return { ok: true, accountProvisioned: false, reason: "account_already_active" };
  }

  const setupEmail = await (dependencies?.sendPaidCustomerAccountSetupEmailFn ?? sendPaidCustomerAccountSetupEmail)({
      to: email,
      businessName,
      orderReference: input.order.stripe_checkout_session_id,
      activationToken: activation.token
    });
  if (!setupEmail.sent) {
      console.warn("[paid-account-provisioning] account_email_not_sent", {
        orderReference: input.order.stripe_checkout_session_id,
        reason: setupEmail.reason
      });
  }

  return { ok: true, accountProvisioned: true };
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
  const activationExpiresAt = new Date(input.now.getTime() + customerActivationTtlMs).toISOString();
  const existing = await client.from("customers").select("id,account_status").eq("email", input.email).maybeSingle();
  const existingStatus = readString(existing.data?.account_status);
  const wasAlreadyActive = existingStatus === "active";
  const accountStatus = wasAlreadyActive ? "active" : "pending_activation";
  const activationFields = wasAlreadyActive
    ? {
        activation_token_hash: null,
        activation_expires_at: null
      }
    : {
        activation_token_hash: input.activationTokenHash,
        activation_expires_at: activationExpiresAt
      };

  const result = await client
    .from("customers")
    .upsert(
      {
        email: input.email,
        name: input.name ?? null,
        phone: input.phone ?? null,
        role: "customer",
        account_status: accountStatus,
        ...activationFields,
        updated_at: input.now.toISOString()
      },
      { onConflict: "email" }
    )
    .select("id")
    .maybeSingle();
  if (result.error || !result.data?.id) return { ok: false as const, error: result.error?.message ?? "Customer could not be provisioned." };
  return { ok: true as const, customerId: String(result.data.id), wasAlreadyActive };
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

async function updateBusiness(
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

async function upsertHostedPageCode(
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

async function findHostedSubscriptionForProvisioning(
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

function normalizeExistingHostedSubscription(row: unknown): ExistingHostedSubscription | null {
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
    hosted_page_url: hostedPageUrl,
    updated_at: readString(value.updated_at)
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

function orderRequestsAccount(order: OrderRecord) {
  const details = order.customer_details_json;
  return Boolean(details && typeof details === "object" && (details as Record<string, unknown>).create_account === true);
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
      iconKey: button.type,
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

function getHostedLineItemIndexes(items: OrderLineItem[]) {
  return items.flatMap((item, index) => (getHostedLineItem(item) ? [index] : []));
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

function resolvePublicSiteUrl(siteUrl?: string) {
  return (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "");
}

function resolvePublicAssetUrl(value: string | undefined, siteUrl: string) {
  if (!value) return undefined;

  try {
    return new URL(value, `${siteUrl}/`).toString();
  } catch {
    return undefined;
  }
}

function snapshotPredatesProvisioning(publishedAt: string, subscriptionUpdatedAt: string | undefined) {
  if (!subscriptionUpdatedAt) return false;
  const publishedTime = Date.parse(publishedAt);
  const subscriptionTime = Date.parse(subscriptionUpdatedAt);
  return Number.isFinite(publishedTime) && Number.isFinite(subscriptionTime) && publishedTime < subscriptionTime;
}

export function buildProvisioningSnapshotVersion(now: Date, checkoutSessionId: string, itemIndex: number, isReconciliation = false) {
  const sessionSuffix = checkoutSessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-24) || "checkout";
  const prefix = isReconciliation ? "reconciled" : "provisioned";
  return `${prefix}-${now.getTime()}-${sessionSuffix}-${itemIndex + 1}`;
}

function resolveHostedPageUrl(existingUrl: string | null | undefined, siteUrl: string, code: string) {
  const canonicalUrl = `${siteUrl}/p/${code}`;
  if (!existingUrl) return canonicalUrl;

  try {
    const existing = new URL(existingUrl);
    const canonical = new URL(canonicalUrl);
    const existingIsLocal = existing.hostname === "localhost" || existing.hostname === "127.0.0.1";
    const canonicalIsPublic = canonical.hostname !== "localhost" && canonical.hostname !== "127.0.0.1";
    return existingIsLocal && canonicalIsPublic ? canonicalUrl : existingUrl;
  } catch {
    return canonicalUrl;
  }
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
