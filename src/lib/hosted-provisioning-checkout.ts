import { createCustomerActivationToken } from "@/lib/customer-account";
import { sendHostedAccountReadyEmail, sendHostedSetupEmail } from "@/lib/hosted-setup-email";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot, readCurrentHostedPageSnapshot } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot } from "@/lib/hosted-pages/snapshots";
import { completeStripeReceipt, hasStripeReceipt, withStripeResourceLock } from "@/lib/stripe-processing";
import { createHash, randomUUID } from "node:crypto";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import { createEmailIdempotencyKey } from "@/lib/email-deliveries";
import { getPaidBrandedHostedReservation } from "@/lib/branded-proof";
import { type HostedSubscriptionProvisioningResult, type HostedSubscriptionProvisioningInput, type HostedSubscriptionProvisioningDependencies } from "./hosted-provisioning-types";
import { repairHostedOrderTargets, resolveDependencies, upsertCustomer, createBusiness, updateBusiness, upsertHostedEditorPage, upsertHostedPageCode, upsertHostedSubscription, findHostedSubscriptionForProvisioning } from "./hosted-provisioning-repository";
import { isHostedSubscriptionCheckout, mapStripeSubscriptionLifecycle, buildHostedBusinessId, attachHostedTargets, buildPhysicalProductRef, readInitialMultiLinkButtons, buildSnapshotButtons, getHostedLineItemIndexes, readSetup, normalizeEmail, readString, readStripeId, readSubscriptionObject, resolvePublicSiteUrl, resolvePublicAssetUrl, buildProvisioningSnapshotVersion, resolveHostedPageUrl, readSubscriptionStatus, readCurrentPeriodEnd } from "./hosted-provisioning-model";

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
  const checkoutSessionId = input.session.id;
  const stripeSubscriptionId = readStripeId(input.session.subscription) ?? `checkout:${input.session.id}`;
  return withStripeResourceLock<HostedSubscriptionProvisioningResult>(client, `subscription:${stripeSubscriptionId}`, async (assertActive) => {
    const receiptId = `checkout:${input.session.id}:provision:v2`;
    if (await hasStripeReceipt(client, receiptId)) {
      await assertActive();
      await repairHostedOrderTargets(client, checkoutSessionId, publicSiteUrl, storage);
      return { ok: true, provisioned: false, reason: "duplicate_event" };
    }
    const subscriptionSource = resolved.retrieveSubscription
      ? await resolved.retrieveSubscription(stripeSubscriptionId) : input.session.subscription;
    await assertActive();

    const email = normalizeEmail(input.session.customer_details?.email ?? input.session.customer_email ?? input.order.email);
    if (!email) return { ok: false, error: "Customer email is required for hosted provisioning." };
    return withStripeResourceLock<HostedSubscriptionProvisioningResult>(client, `customer:${createHash("sha256").update(email).digest("hex")}`, async () => {

    const hostedItemIndexes = getHostedLineItemIndexes(input.order.line_items_json);
    if (!hostedItemIndexes.length) return { ok: false, error: "Paid order does not contain a hosted line item." };
    const stripeCustomerId = readStripeId(input.session.customer);
    const readStatus = readSubscriptionStatus(subscriptionSource);
    const subscriptionStatus = readStatus === "unknown" ? "active" : readStatus;
    const lifecycleStatus = mapStripeSubscriptionLifecycle(subscriptionSource, now);
    const paidThrough = readCurrentPeriodEnd(subscriptionSource);
    const activation = createCustomerActivationToken();

    const customer = await upsertCustomer(client, {
      email,
      name: input.session.customer_details?.name ?? input.order.customer_name ?? null,
      phone: input.session.customer_details?.phone ?? null,
      activationTokenHash: activation.tokenHash,
      activationToken: activation.token,
      now
    });
    if (!customer.ok) return customer;

    let lineItems = input.order.line_items_json;
    let firstHostedPage: { code: string; hostedPageUrl: string; businessName: string } | null = null;
    const shouldReuseExistingCustomerPage = hostedItemIndexes.length === 1;

    for (const hostedItemIndex of hostedItemIndexes) {
      await assertActive();
      const hostedItem = input.order.line_items_json[hostedItemIndex];
      const setup = readSetup(hostedItem);
      const proofReservation = await getPaidBrandedHostedReservation(hostedItem, checkoutSessionId, storage);
      const businessName = readString(setup.businessName) ?? input.order.customer_name ?? input.session.customer_details?.name ?? "Tap Rater Customer";
      const logoUrl = resolvePublicAssetUrl(readString(setup.logoMediaUrl), publicSiteUrl);
      const initialButtons = readInitialMultiLinkButtons(setup.multiLinkButtons);
      const lineSessionId = hostedItemIndexes.length > 1 ? `${checkoutSessionId}:line:${hostedItemIndex + 1}` : checkoutSessionId;
      const existingMatch = await findHostedSubscriptionForProvisioning(client, {
        customerId: customer.customerId,
        checkoutSessionId: lineSessionId,
        allowExpiredCustomerPageReuse: shouldReuseExistingCustomerPage && !proofReservation
      });
      if (!existingMatch.ok) return existingMatch;
      const existingHostedSubscription = existingMatch.match?.subscription ?? null;
      const retained = existingMatch.match?.reason === "checkout_session" ? existingHostedSubscription : null;
      const itemLifecycleStatus = retained?.lifecycle_status === "RETIRED_INTERNAL" ? "RETIRED_INTERNAL" : lifecycleStatus;
      const itemPaidThrough = paidThrough ?? retained?.current_period_end ?? null;
      const pastDueSince = itemLifecycleStatus === "PAST_DUE" ? retained?.past_due_since ?? now.toISOString() : null;
      const lineSubscriptionId = stripeSubscriptionId;
      const physicalProductRef = proofReservation?.physicalProductRef ?? buildPhysicalProductRef(input.order, checkoutSessionId, hostedItemIndex);
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
            id: buildHostedBusinessId(checkoutSessionId, hostedItemIndex),
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
          code: proofReservation?.code,
          now,
          generateCode: dependencies?.generateCode
        });
      const hostedPageUrl = proofReservation?.url ?? resolveHostedPageUrl(existingHostedSubscription?.hosted_page_url, publicSiteUrl, assignment.code);
      if (proofReservation && assignment.code !== proofReservation.code) throw new Error("Provisioned page differs from the approved stand QR.");
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
          lifecycleStatus: itemLifecycleStatus,
          businessName,
          logoUrl: logoUrl ?? null,
          initialButtons,
          now
        });
      if (!page.ok) return page;
      if (retained) {
        const pageUpdate = await client.from("hosted_page_editor_pages")
          .update({ lifecycle_status: itemLifecycleStatus, updated_at: now.toISOString() }).eq("id", page.pageId);
        if (pageUpdate.error) return { ok: false, error: pageUpdate.error.message };
      }

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
        lifecycleStatus: itemLifecycleStatus,
        currentPeriodEnd: itemPaidThrough,
        pastDueSince,
        cancelAtPeriodEnd: Boolean(readSubscriptionObject(subscriptionSource)?.cancel_at_period_end),
        provisioningStatus: "ready_for_customer_setup",
        now
      });
      if (!subscription.ok) return subscription;

      const publishedPage = await readCurrentHostedPageSnapshot(storage, assignment.code);
      if (!publishedPage || existingMatch.match?.reason === "expired_customer_page") {
        await assertActive();
        await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
          schemaVersion: 1,
          code: assignment.code,
          version: `${buildProvisioningSnapshotVersion(now, checkoutSessionId, hostedItemIndex, Boolean(existingHostedSubscription))}-${randomUUID().slice(0, 8)}`,
          publishedAt: now.toISOString(),
          lifecycleStatus: itemLifecycleStatus,
          businessName,
          logoUrl: logoUrl ?? undefined,
          headline: businessName,
          buttons: buildSnapshotButtons(initialButtons),
          description: initialButtons.length ? "Choose an option below." : "This Tap Rater page is being set up.",
          appearance: { theme: "light", accentColor: "#0f766e" },
          subscriptionPaidThrough: itemPaidThrough ?? undefined,
          subscriptionPastDueSince: pastDueSince ?? undefined
        }));
      } else if (publishedPage.lifecycleStatus !== itemLifecycleStatus ||
        publishedPage.subscriptionPaidThrough !== (itemPaidThrough ?? undefined) ||
        publishedPage.subscriptionPastDueSince !== (pastDueSince ?? undefined)) {
        await assertActive();
        await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
          ...publishedPage,
          lifecycleStatus: itemLifecycleStatus,
          subscriptionPaidThrough: itemPaidThrough ?? undefined,
          subscriptionPastDueSince: pastDueSince ?? undefined,
          version: `provision-retry-${Date.now()}-${randomUUID()}`,
          publishedAt: now.toISOString()
        }));
      }

      firstHostedPage ??= { code: assignment.code, hostedPageUrl, businessName };
    }

    await assertActive();
    const orderUpdate = await client
      .from("orders")
      .update({
        line_items_json: lineItems,
        production_status: input.order.production_status === "not_started" ? "ready_for_production" : input.order.production_status,
        updated_at: now.toISOString()
      })
      .eq("stripe_checkout_session_id", input.session.id);
    if (orderUpdate.error) return { ok: false, error: orderUpdate.error.message };

    {
      const notificationSender = (message: import("@/lib/email").SendEmailInput) => sendCommerceEmail({ ...message,
        delivery: { ...message.delivery!, idempotencyKey: createEmailIdempotencyKey("hosted_checkout_setup", checkoutSessionId) } }, { client });
      const setupEmail = customer.activationPending
        ? { sent: true as const }
        : customer.wasAlreadyActive
        ? await (dependencies?.sendHostedAccountReadyEmailFn ?? sendHostedAccountReadyEmail)({
          to: email,
          businessName: firstHostedPage?.businessName ?? input.order.customer_name ?? "Tap Rater Customer",
          hostedPageUrl: firstHostedPage?.hostedPageUrl ?? `${publicSiteUrl}/account`,
          sendEmailFn: notificationSender
        })
        : await (dependencies?.sendHostedSetupEmailFn ?? sendHostedSetupEmail)({
          to: email,
          businessName: firstHostedPage?.businessName ?? input.order.customer_name ?? "Tap Rater Customer",
          hostedPageUrl: firstHostedPage?.hostedPageUrl ?? `${publicSiteUrl}/account`,
          activationToken: customer.activationToken!,
          sendEmailFn: notificationSender
        });
      if (!setupEmail.sent) {
        console.warn("[hosted-provisioning] setup_email_not_sent", {
          stripeCheckoutSessionId: input.session.id,
          reason: setupEmail.reason
        });
        return { ok: false, error: "Hosted account notification needs recovery." };
      }
    }

    await assertActive();
    await completeStripeReceipt(client, receiptId, input.eventType ?? "checkout.session.completed", now);
    return { ok: true, provisioned: true, code: firstHostedPage?.code, hostedPageUrl: firstHostedPage?.hostedPageUrl };
    });
  });
}
