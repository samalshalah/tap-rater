import { createCustomerActivationToken } from "@/lib/customer-account";
import { sendCustomerAccountSetupEmail, sendHostedAccountReadyEmail, sendHostedSetupEmail, sendPaidCustomerAccountSetupEmail } from "@/lib/hosted-setup-email";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot } from "@/lib/hosted-pages/snapshots";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { completeStripeReceipt, hasStripeReceipt, withStripeResourceLock } from "@/lib/stripe-processing";
import { createHash } from "node:crypto";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import { createEmailIdempotencyKey } from "@/lib/email-deliveries";
import { type ManualCustomerAccountProvisioningInput, type ManualCustomerAccountProvisioningResult, type PaidCustomerAccountProvisioningResult, type HostedSubscriptionProvisioningDependencies } from "./hosted-provisioning-types";
import { resolveClientDependency, upsertCustomer, createBusiness, updateBusiness, upsertHostedEditorPage, upsertHostedPageCode, upsertHostedSubscription, findHostedSubscriptionForProvisioning } from "./hosted-provisioning-repository";
import { buildHostedBusinessId, attachHostedTargets, buildPhysicalProductRef, readManualOrderBusinessName, readManualOrderLogoUrl, readCustomerPhone, orderRequestsAccount, readInitialMultiLinkButtons, buildSnapshotButtons, getHostedLineItemIndexes, readSetup, normalizeEmail, readString, resolvePublicSiteUrl, resolvePublicAssetUrl } from "./hosted-provisioning-model";

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
  return withStripeResourceLock<PaidCustomerAccountProvisioningResult>(client, `customer:${createHash("sha256").update(email).digest("hex")}`, async (assertActive) => {
  const receiptId = `checkout:${input.order.stripe_checkout_session_id}:account:v1`;
  if (await hasStripeReceipt(client, receiptId)) return { ok: true, accountProvisioned: false, reason: "account_already_active" };
  const customer = await upsertCustomer(client, {
    email,
    name: input.order.customer_name ?? null,
    phone: readCustomerPhone(input.order.customer_details_json),
    activationTokenHash: activation.tokenHash,
    activationToken: activation.token,
    now
  });
  if (!customer.ok) return customer;

  const business = await createBusiness(client, {
    id: buildHostedBusinessId(input.order.stripe_checkout_session_id, -1),
    customerId: customer.customerId,
    businessName,
    logoUrl: readManualOrderLogoUrl(input.order),
    now
  });
  if (!business.ok) return business;

  if (customer.wasAlreadyActive || customer.activationPending) {
    await assertActive();
    await completeStripeReceipt(client, receiptId, "checkout.account");
    return { ok: true, accountProvisioned: false, reason: "account_already_active" };
  }

  const setupEmail = await (dependencies?.sendPaidCustomerAccountSetupEmailFn ?? sendPaidCustomerAccountSetupEmail)({
    to: email,
    businessName,
    orderReference: input.order.stripe_checkout_session_id,
    activationToken: customer.activationToken!,
    sendEmailFn: message => sendCommerceEmail({ ...message, delivery: { ...message.delivery!,
      idempotencyKey: createEmailIdempotencyKey("paid_customer_activation", input.order.stripe_checkout_session_id) } }, { client })
  });
  if (!setupEmail.sent) {
    console.warn("[paid-account-provisioning] account_email_not_sent", {
      orderReference: input.order.stripe_checkout_session_id,
      reason: setupEmail.reason
    });
    return { ok: false, error: "Customer activation email needs recovery." };
  }
  await assertActive();
  await completeStripeReceipt(client, receiptId, "checkout.account");
  return { ok: true, accountProvisioned: true };
  });
}
