import { getProductMediaObject,isSafeProductMediaKey } from "@/lib/admin-media-storage";
import { getSupabaseAdmin,hasSupabaseAdminConfig } from "@/lib/db";
import { isProofApprovalSnapshotCurrent } from "@/lib/direct-production";
import { canRunOrderProductionActions } from "@/lib/order-fulfillment-rules";
import {
buildCurrentApprovalSnapshot,
generateProductionArtworkForOrderLineItem,
getProductionArtworkTemplate,
readProductionArtworkReference,
type ProductionArtworkAssetResolver,
type ProductionArtworkStorage
} from "@/lib/production-artwork";
import { type StripeProcessingGuard } from "@/lib/stripe-processing";
import { createHash } from "node:crypto";
import { applyOrderLineItemFulfillmentInference,getOrderLineItemFulfillmentKind,getOrderProductionBlockers,normalizeOrderRecord,readSetupString } from "./order-model";
import { guardedOrderUpdate } from "./order-persistence";
import type { OrderLineItem,OrderRecord,OrdersDbClient } from "./order-types";

type PaidArtworkOptions = {
  storage?: ProductionArtworkStorage;
  assetResolver?: ProductionArtworkAssetResolver;
  artworkExists?: (key: string) => Promise<boolean>;
  assertActive?: StripeProcessingGuard;
};

export function getAdminOrderArtworkUrl(order: Pick<OrderRecord, "id">, lineItemIndex: number) {
  return order.id && Number.isSafeInteger(lineItemIndex) && lineItemIndex >= 0
    ? `/api/admin/orders/${encodeURIComponent(order.id)}/artwork/${lineItemIndex}`
    : undefined;
}

export function getOrderArtworkStorageKey(order: OrderRecord, lineItemIndex: number) {
  const item = order.line_items_json[lineItemIndex];
  const reference = item && readProductionArtworkReference(item);
  const key = reference?.status === "generated" ? reference.storageKey : undefined;
  if (!key || !isSafeProductMediaKey(key)) return undefined;
  const parts = key.split("/");
  const orderReferences = [order.stripe_checkout_session_id, order.id].filter((value): value is string => Boolean(value)).map(artworkKeySegment);
  return parts.length === 5 && parts[1] === artworkKeySegment(item.productId) && parts[2] === "production_artwork" &&
    orderReferences.includes(parts[3]) && new RegExp(`^line-${lineItemIndex + 1}-[a-f0-9]{16,64}\\.svg$`).test(parts[4])
    ? key : undefined;
}

function artworkKeySegment(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "item";
}

function artworkSnapshotHash(value: unknown): string {
  const sort = (entry: unknown): unknown => Array.isArray(entry) ? entry.map(sort) : entry && typeof entry === "object"
    ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sort(item)])) : entry;
  return createHash("sha256").update(JSON.stringify(sort(value))).digest("hex");
}

function hasCurrentArtworkApproval(item: OrderLineItem) {
  try {
    return item.proofApproved === true && item.setup?.designAssistanceRequested !== true &&
      isProofApprovalSnapshotCurrent(buildCurrentApprovalSnapshot(item), item.setup?.proofApprovalSnapshot);
  } catch {
    return false;
  }
}

export function hasProvisionedArtworkTargets(item: OrderLineItem) {
  if (getOrderLineItemFulfillmentKind(item) !== "hosted") return true;
  const target = readSetupString(item.setup, "qrTargetUrl");
  return Boolean(readSetupString(item.setup, "hostedPageCode") && target &&
    target === readSetupString(item.setup, "generatedQrValue") && target === readSetupString(item.setup, "nfcTargetUrl"));
}

export function withoutProductionArtwork(item: OrderLineItem): OrderLineItem {
  return { ...item, setup: Object.fromEntries(Object.entries(item.setup ?? {}).filter(([key]) => key !== "productionArtwork")) };
}

export async function canReuseOrderArtwork(order: OrderRecord, index: number, options: PaidArtworkOptions) {
  const item = order.line_items_json[index];
  const reference = readProductionArtworkReference(item);
  const template = getProductionArtworkTemplate(item);
  const key = getOrderArtworkStorageKey(order, index);
  const approved = buildCurrentApprovalSnapshot(item);
  if (!reference || !template || !key || !hasCurrentArtworkApproval(item) ||
    reference.approvalSnapshotHash !== artworkSnapshotHash(item.setup?.proofApprovalSnapshot) ||
    !key.endsWith(`-${reference.approvalSnapshotHash.slice(0, 16)}.svg`) ||
    reference.templateId !== template.id || reference.templateVersion !== template.version ||
    reference.widthPx !== template.widthPx || reference.heightPx !== template.heightPx || reference.dpi !== template.dpi ||
    reference.widthIn !== template.widthIn || reference.heightIn !== template.heightIn ||
    (approved.baseTemplateContentHash && reference.baseTemplateContentHash !== approved.baseTemplateContentHash) ||
    (approved.logoContentHash && reference.logoContentHash !== approved.logoContentHash) ||
    !reference.baseTemplateContentHash || !reference.logoContentHash) return false;
  return options.artworkExists ? options.artworkExists(key) : Boolean(await getProductMediaObject(key));
}

export async function ensurePaidOrderProductionArtwork(stripeCheckoutSessionId: string, options: Pick<PaidArtworkOptions, "assertActive"> = {}) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return ensurePaidOrderProductionArtworkWithClient(getSupabaseAdmin(), stripeCheckoutSessionId, options);
}

// The caller holds the payment lease. Reload after provisioning and persist each line
// independently so a failed later line cannot discard successful artwork references.
export async function ensurePaidOrderProductionArtworkWithClient(
  client: OrdersDbClient,
  stripeCheckoutSessionId: string,
  options: PaidArtworkOptions = {}
): Promise<{ ok: true; order: OrderRecord; paymentReversed?: boolean } | { ok: false; error: string }> {
  try {
    await options.assertActive?.();
    const lookup = await client.from("orders").select("*").eq("stripe_checkout_session_id", stripeCheckoutSessionId).maybeSingle();
    if (lookup.error || !lookup.data) return { ok: false, error: lookup.error?.message ?? "Paid order was not found." };
    let order = normalizeOrderRecord(lookup.data);
    const waitingForArtwork = order.line_items_json.some((item) => item.optionId === "branded_qr_direct" && readProductionArtworkReference(item)?.status !== "generated");
    if (order.stripe_refund_id || order.refund_status || order.payment_status?.includes("refund")) return { ok: true, order, paymentReversed: true };
    if (order.status !== "paid" || !["paid", "complimentary"].includes(order.payment_status ?? "")) return { ok: false, error: "Artwork requires confirmed payment or a complimentary order." };
    if (!canRunOrderProductionActions(order)) return { ok: true, order };
    for (let index = 0; index < order.line_items_json.length; index++) {
      const item = order.line_items_json[index];
      if (item.optionId !== "branded_qr_direct") continue;
      await options.assertActive?.();
      const url = getAdminOrderArtworkUrl(order, index);
      if (!url) return { ok: false, error: "Artwork requires a persisted order identifier." };
      if (!hasCurrentArtworkApproval(item)) return { ok: false, error: `Line ${index + 1} requires approval of the current artwork.` };
      if (!hasProvisionedArtworkTargets(item)) {
        return { ok: false, error: "Hosted artwork requires the approved permanent QR and NFC destination." };
      }
      const reusable = await canReuseOrderArtwork(order, index, options);
      const generated = reusable ? item : await generateProductionArtworkForOrderLineItem({
        orderReference: order.stripe_checkout_session_id, lineItemIndex: index, item: withoutProductionArtwork(item), assetResolver: options.assetResolver
      }, options.storage);
      const reference = readProductionArtworkReference(generated);
      const lineItems = order.line_items_json.slice();
      lineItems[index] = applyOrderLineItemFulfillmentInference({ ...generated, setup: {
        ...generated.setup, ...(reference ? { productionArtwork: { ...reference, url: reference.status === "generated" ? url : undefined } } : {})
      } });
      const generatedKey = getOrderArtworkStorageKey({ ...order, line_items_json: lineItems }, index);
      const failed = reference?.status !== "generated" || !generatedKey;
      if (!reusable || reference?.url !== url) {
        await options.assertActive?.();
        const payload = { line_items_json: lineItems, ...(failed ? { production_status: "blocked" } : {}), updated_at: new Date().toISOString() };
        const saved = await guardedOrderUpdate(client, order, payload).select("*").maybeSingle();
        if (saved.error || !saved.data) return { ok: false, error: saved.error?.message ?? "Order changed during artwork generation. Retry the event." };
        order = normalizeOrderRecord(saved.data);
      }
      if (failed) return { ok: false, error: reference?.error ?? `Line ${index + 1} production artwork could not be generated.` };
    }
    await options.assertActive?.();
    if (waitingForArtwork && ["blocked", "not_started"].includes(order.production_status) &&
      order.shipping_status !== "blocked" && getOrderProductionBlockers(order).length === 0) {
      const saved = await guardedOrderUpdate(client, order, { production_status: "ready_for_production" }).select("*").maybeSingle();
      if (saved.error || !saved.data) return { ok: false, error: saved.error?.message ?? "Order changed during artwork recovery. Retry the event." };
      order = normalizeOrderRecord(saved.data);
    }
    return { ok: true, order };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Production artwork could not be completed." };
  }
}

