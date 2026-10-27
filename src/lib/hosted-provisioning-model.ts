import { type HostedPageButton, type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import { supportedHostedPageButtons, type HostedPageEditorButton } from "@/lib/hosted-page-editor-shared";
import type { OrderLineItem, OrderRecord, StripeCheckoutSessionLike } from "@/lib/orders";
import { createHash } from "node:crypto";
import { mapSubscriptionLifecycle } from "@/lib/hosted-subscription-lifecycle";
import { type HostedSubscriptionStatus, type StripeSubscriptionLike, type ExistingHostedSubscription } from "./hosted-provisioning-types";

export function isHostedSubscriptionCheckout(session: StripeCheckoutSessionLike, order: Pick<OrderRecord, "line_items_json">) {
  const metadataIntent = session.metadata?.checkout_intent;
  return metadataIntent === "hosted_subscription" || order.line_items_json.some((item) => getHostedLineItem(item));
}

export function mapStripeSubscriptionLifecycle(subscription: unknown, _now = new Date()): HostedPageLifecycleStatus {
  return mapSubscriptionLifecycle(subscription);
}

export function buildHostedBusinessId(checkoutSessionId: string, itemIndex: number) {
  const hex = createHash("sha256").update(`taprater-business:${checkoutSessionId}:${itemIndex}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function normalizeExistingHostedSubscription(row: unknown): ExistingHostedSubscription | null {
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
    updated_at: readString(value.updated_at),
    lifecycle_status: readString(value.lifecycle_status),
    past_due_since: readString(value.past_due_since),
    current_period_end: readString(value.current_period_end)
  };
}

export function attachHostedTargets(
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
        generatedQrValue: item.optionId === "standard_direct" ? undefined : hostedPageUrl,
        qrTargetUrl: item.optionId === "standard_direct" ? undefined : hostedPageUrl,
        nfcTargetUrl: hostedPageUrl,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        subscriptionStatus: subscription.subscriptionStatus,
        hasQr: item.optionId !== "standard_direct",
        nfcOnly: item.optionId === "standard_direct"
      }
    };
  });
}

export function buildPhysicalProductRef(order: OrderRecord, checkoutSessionId: string, itemIndex: number) {
  return `stripe-checkout:${checkoutSessionId}:order:${order.id ?? "pending"}:line:${itemIndex + 1}`;
}

export function readManualOrderBusinessName(order: OrderRecord) {
  for (const item of order.line_items_json) {
    const businessName = readString(readSetup(item).businessName);
    if (businessName) return businessName;
  }

  return order.customer_name ?? normalizeEmail(order.email) ?? "Tap Rater Customer";
}

export function readManualOrderLogoUrl(order: OrderRecord) {
  for (const item of order.line_items_json) {
    const setup = readSetup(item);
    const logoUrl = readString(setup.logoMediaUrl);
    if (logoUrl) return logoUrl;
  }

  return null;
}

export function readCustomerPhone(value: unknown) {
  return value && typeof value === "object" ? readString((value as Record<string, unknown>).phone) ?? null : null;
}

export function orderRequestsAccount(order: OrderRecord) {
  const details = order.customer_details_json;
  return Boolean(details && typeof details === "object" && (details as Record<string, unknown>).create_account === true);
}

export function buildInitialDraft(businessName: string, logoUrl?: string, buttons: HostedPageEditorButton[] = []) {
  return {
    businessName,
    logoUrl,
    headline: businessName,
    description: buttons.length ? "Choose an option below." : "This Tap Rater page is being set up.",
    appearance: { theme: "light" as const, accentColor: "#0f766e" as const },
    buttons
  };
}

export function readInitialMultiLinkButtons(value: unknown): HostedPageEditorButton[] {
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

export function buildSnapshotButtons(buttons: HostedPageEditorButton[]): HostedPageButton[] {
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

export function readEditorButtonType(value: unknown) {
  return typeof value === "string" && supportedHostedPageButtons.some((button) => button.type === value) ? value as HostedPageEditorButton["type"] : undefined;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getHostedLineItem(item: OrderLineItem) {
  return item.optionId === "hosted_multilink" || item.destinationMode === "HOSTED" ? item : null;
}

export function getHostedLineItemIndexes(items: OrderLineItem[]) {
  return items.flatMap((item, index) => (getHostedLineItem(item) ? [index] : []));
}

export function readSetup(item: OrderLineItem) {
  return item.setup && typeof item.setup === "object" ? item.setup : {};
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" && value.includes("@") ? value.trim().toLowerCase() : undefined;
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readStripeId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "id" in value) return readString((value as { id?: unknown }).id);
  return undefined;
}

export function readSubscriptionObject(value: unknown): StripeSubscriptionLike | null {
  return value && typeof value === "object" ? (value as StripeSubscriptionLike) : null;
}

export function resolvePublicSiteUrl(siteUrl?: string) {
  return (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://taprater.com").replace(/\/+$/, "");
}

export function resolvePublicAssetUrl(value: string | undefined, siteUrl: string) {
  if (!value) return undefined;

  try {
    return new URL(value, `${siteUrl}/`).toString();
  } catch {
    return undefined;
  }
}

export function buildProvisioningSnapshotVersion(now: Date, checkoutSessionId: string, itemIndex: number, isReconciliation = false) {
  const sessionSuffix = checkoutSessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-24) || "checkout";
  const prefix = isReconciliation ? "reconciled" : "provisioned";
  return `${prefix}-${now.getTime()}-${sessionSuffix}-${itemIndex + 1}`;
}

export function resolveHostedPageUrl(existingUrl: string | null | undefined, siteUrl: string, code: string) {
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

export function readSubscriptionStatus(value: unknown): HostedSubscriptionStatus {
  const status = readSubscriptionObject(value)?.status;
  if (status === "paused") return "unpaid";
  if (status === "incomplete_expired") return "canceled";
  return status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete" ||
    status === "trialing"
    ? status
    : "unknown";
}

export function readCurrentPeriodEnd(value: unknown) {
  const subscription = readSubscriptionObject(value);
  const periods = subscription?.items?.data?.map((item) => item.current_period_end).filter((period): period is number => typeof period === "number" && Number.isFinite(period)) ?? [];
  const epochSeconds = subscription?.current_period_end ?? (periods.length ? Math.min(...periods) : null);
  return typeof epochSeconds === "number" && Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000).toISOString() : null;
}
