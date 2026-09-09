import { randomUUID } from "node:crypto";
import type { MigratedProduct } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
import type { CheckoutCartRow } from "@/lib/checkout";
import { buildProofApprovalSnapshot, isHttpUrl, isProofApprovalSnapshotCurrent, type ProofApprovalSnapshot } from "@/lib/direct-production";
import { getProductMediaUrl, isSafeProductMediaKey } from "@/lib/admin-media-storage";
import { buildCurrentApprovalSnapshot, composeProductionArtworkDocument, getProductionArtworkTemplate, type ProductionArtworkAssetResolver } from "@/lib/production-artwork";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { assignPermanentHostedPageCode, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { brandedStandComposition } from "@/lib/branded-composition";
import type { OrderLineItem } from "@/lib/orders";

type Reservation = { id: string; productSlug: string; code: string; url: string; physicalProductRef: string };
type Receipt = { snapshot: ProofApprovalSnapshot; hostedReservationId?: string; createdAt: string };
const privateOptions = { contentType: "application/json", cacheControl: "private, no-store" };

export async function requireProofStorage() {
  const storage = await getHostedPageStorage();
  if (!storage) throw new Error("Artwork preview storage is unavailable. Please try again later.");
  return storage;
}

export async function reserveBrandedHostedDestination(productSlug: string, storage: HostedPageTextStorage, siteUrl: string) {
  const id = randomUUID();
  const physicalProductRef = `branded-proof:${id}`;
  const assignment = await assignPermanentHostedPageCode(storage, { physicalProductRef, assignedBy: "branded-preview" });
  const reservation: Reservation = { id, productSlug, code: assignment.code, url: `${siteUrl.replace(/\/+$/, "")}/p/${assignment.code}`, physicalProductRef };
  await storage.putText(reservationKey(id), JSON.stringify(reservation), privateOptions);
  return reservation;
}

export async function readBrandedHostedReservation(id: string, storage: HostedPageTextStorage) {
  assertId(id);
  const json = await storage.getText(reservationKey(id));
  if (!json) throw new Error("The Multi-Link preview destination is missing. Start the stand setup again.");
  return JSON.parse(json) as Reservation;
}

export async function createBrandedProof(product: MigratedProduct, setup: NonNullable<CartItem["setup"]>, storage: HostedPageTextStorage, assetResolver?: ProductionArtworkAssetResolver) {
  const logoKey = setup.logoStorageKey;
  if (!logoKey || !isSafeProductMediaKey(logoKey) || !logoKey.startsWith(`products/customer-setup-${product.slug}/`) || !/\.(png|jpe?g|webp)$/i.test(logoKey)) {
    throw new Error("Upload a logo for this stand before creating its preview.");
  }
  const hosted = setup.serviceAddon === "hosted_multilink";
  const reservation = hosted && setup.hostedReservationId ? await readBrandedHostedReservation(setup.hostedReservationId, storage) : undefined;
  if (hosted && (!reservation || reservation.productSlug !== product.slug)) throw new Error("Reserve the Multi-Link destination first.");
  const qrTargetUrl = reservation?.url ?? setup.destinationUrl?.trim();
  if (!isHttpUrl(qrTargetUrl)) throw new Error("Enter a valid destination link first.");
  const canonicalSetup = {
    ...setup,
    productSlug: product.slug,
    optionCode: "branded_qr_direct" as const,
    destinationUrl: hosted ? undefined : qrTargetUrl,
    frontTemplateUrl: product.assetSet?.brandedFrontTemplateUrl,
    logoMediaUrl: getProductMediaUrl(logoKey),
    generatedQrValue: qrTargetUrl,
    qrTargetUrl,
    rendererVersion: brandedStandComposition.templateVersion,
    baseTemplateContentHash: undefined,
    logoContentHash: undefined
  };
  if (!canonicalSetup.businessName?.trim()) throw new Error("Enter the business name first.");
  const item: OrderLineItem = { productId: product.slug, optionId: "branded_qr_direct", title: product.title, sku: product.sku, quantity: 1, unitAmountCents: 0, lineSubtotalCents: 0, setup: canonicalSetup };
  const template = getProductionArtworkTemplate(item);
  if (!template) throw new Error("A Branded print template is not available for this product.");
  const createdAt = new Date().toISOString();
  // The SVG is returned only as a transient preview; no final artwork is stored here.
  const composed = await composeProductionArtworkDocument(item, template, "preview", createdAt, assetResolver);
  const snapshot = buildProofApprovalSnapshot({ ...buildCurrentApprovalSnapshot(item), ...composed.assetHashes });
  const proofReceiptId = randomUUID();
  const receipt: Receipt = { snapshot, hostedReservationId: reservation?.id, createdAt };
  await storage.putText(receiptKey(proofReceiptId), JSON.stringify(receipt), privateOptions);
  return { svg: composed.svg, snapshot, proofReceiptId };
}

export async function verifyBrandedCheckoutProofs(rows: CheckoutCartRow[], checkoutAttemptId: string, storage?: HostedPageTextStorage) {
  const branded = rows.filter((row) => row.optionId === "branded_qr_direct");
  if (!branded.length) return;
  const store = storage ?? await requireProofStorage();
  const reservations = new Set<string>();
  for (const row of branded) {
    const id = row.setup.proofReceiptId;
    if (!id) throw new Error("Approve the Branded preview before payment.");
    assertId(id);
    const text = await store.getText(receiptKey(id));
    const receipt = text ? JSON.parse(text) as Receipt : undefined;
    if (!receipt || !isProofApprovalSnapshotCurrent(buildCurrentApprovalSnapshot(row), receipt.snapshot) || receipt.hostedReservationId !== row.setup.hostedReservationId) {
      throw new Error("Your artwork changed. Preview and approve the stand again.");
    }
    if (row.setup.hostedReservationId) {
      const reservation = await readBrandedHostedReservation(row.setup.hostedReservationId, store);
      if (reservation.productSlug !== row.productId || reservation.url !== row.setup.generatedQrValue || reservations.has(reservation.id)) throw new Error("Each Multi-Link stand needs its own approved destination.");
      reservations.add(reservation.id);
    }
  }
  // Claims are immutable and tied to the same Stripe idempotency attempt.
  for (const id of reservations) {
    const key = `hosted-pages/checkout-proofs/claims/${id}.json`;
    const value = JSON.stringify({ checkoutAttemptId });
    const created = await store.putTextIfAbsent(key, value, privateOptions);
    if (!created && await store.getText(key) !== value) throw new Error("This Multi-Link preview was already used for another checkout. Start a new stand setup.");
  }
}

export async function bindBrandedHostedCheckout(rows: CheckoutCartRow[], sessionId: string, storage?: HostedPageTextStorage) {
  const hosted = rows.filter((row) => row.optionId === "branded_qr_direct" && row.setup.hostedReservationId);
  if (!hosted.length) return;
  const store = storage ?? await requireProofStorage();
  for (const row of hosted) {
    const key = bindingKey(row.setup.hostedReservationId!);
    const value = JSON.stringify({ sessionId });
    const created = await store.putTextIfAbsent(key, value, privateOptions);
    if (!created && await store.getText(key) !== value) throw new Error("Multi-Link preview is already attached to a different checkout.");
  }
}

export async function getPaidBrandedHostedReservation(item: OrderLineItem, sessionId: string, storage: HostedPageTextStorage) {
  const id = item.setup?.hostedReservationId;
  if (typeof id !== "string") return undefined;
  const reservation = await readBrandedHostedReservation(id, storage);
  if (reservation.productSlug !== item.productId || reservation.url !== item.setup?.generatedQrValue || await storage.getText(bindingKey(id)) !== JSON.stringify({ sessionId })) {
    throw new Error("Paid Multi-Link order does not match its approved destination.");
  }
  return reservation;
}

function assertId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid artwork reference.");
}
function reservationKey(id: string) { return `hosted-pages/checkout-proofs/reservations/${id}.json`; }
function receiptKey(id: string) { return `hosted-pages/checkout-proofs/receipts/${id}.json`; }
function bindingKey(id: string) { return `hosted-pages/checkout-proofs/bindings/${id}.json`; }
