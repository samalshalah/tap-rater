import type { CheckoutCartRow, ManualProductionWarningCode } from "@/lib/checkout";
import { buildDirectProductionTargets } from "@/lib/direct-production";
import { purchaseOptionIdToCustomizationLevel } from "@/lib/product-model";
import {
  readProductionArtworkReference
} from "@/lib/production-artwork";
import type { CheckoutShippingAddressInput } from "@/lib/validators";
import type { OrderLineItem, OrderLineItemFulfillmentKind, OrderLineItemProductionSummary, OrderRecord, ProductionStatus, ShippingStatus, StripeCheckoutSessionLike } from "./order-types";
export function mapCheckoutRowsToOrderLineItems(rows: CheckoutCartRow[]): OrderLineItem[] {
  return rows.map((row) =>
    applyOrderLineItemFulfillmentInference({
      productId: row.productId,
      optionId: row.optionId,
      optionLabel: row.optionLabel,
      destinationMode: row.destinationMode,
      customizationLevel: row.customizationLevel,
      title: row.title,
      baseSku: row.baseSku,
      sku: row.sku,
      quantity: row.quantity,
      unitAmountCents: row.unitAmountCents,
      monthlyAmountCents: row.monthlyAmountCents,
      lineSubtotalCents: row.lineSubtotalCents,
      discountCents: row.discountCents,
      offerId: row.offerId,
      offerLabel: row.offerLabel,
      setup: Object.fromEntries(Object.entries(row.setup ?? {}).filter(([key]) => key !== "productionArtwork")),
      logoRequired: row.logoRequired,
      logoStatus: row.logoStatus,
      logoReference: row.logoReference ?? null,
      proofRequired: row.proofRequired,
      proofApproved: row.proofApproved,
      productionStatus: row.productionStatus,
      manualProductionRequired: row.manualProductionRequired,
      productionWarningCodes: row.productionWarningCodes
    })
  );
}

export function applyOrderLineItemFulfillmentInference(item: OrderLineItem): OrderLineItem {
  const fulfillmentKind = getOrderLineItemFulfillmentKind(item);

  if (fulfillmentKind === "standard") {
    return {
      ...item,
      destinationMode: item.destinationMode ?? "DIRECT",
      customizationLevel: item.customizationLevel ?? purchaseOptionIdToCustomizationLevel(item.optionId),
      logoRequired: item.logoRequired === true,
      logoStatus: item.logoRequired ? item.logoStatus ?? "manual_collection_required" : "not_required",
      logoReference: item.logoReference ?? null,
      proofRequired: item.proofRequired === true,
      proofApproved: item.proofApproved === true,
      productionStatus: item.productionStatus === "ready_for_direct_activation" ? "ready_for_direct_fulfillment" : item.productionStatus ?? "ready_for_direct_fulfillment",
      manualProductionRequired: item.manualProductionRequired === true,
      productionWarningCodes: normalizeProductionWarningCodes(item.productionWarningCodes)
    };
  }

  if (fulfillmentKind === "hosted") {
    const setup = item.setup && typeof item.setup === "object" ? item.setup : {};
    const hostedPageCode = readSetupString(setup, "hostedPageCode") ?? readSetupString(setup, "permanentPageCode");
    const qrTargetUrl = readSetupString(setup, "qrTargetUrl") ?? readSetupString(setup, "generatedQrValue");
    const nfcTargetUrl = readSetupString(setup, "nfcTargetUrl");
    const hasPrintedQr = item.optionId !== "standard_direct";
    const isProvisioned = Boolean(hostedPageCode && nfcTargetUrl && (!hasPrintedQr || qrTargetUrl));

    return {
      ...item,
      destinationMode: "HOSTED",
      customizationLevel: item.customizationLevel ?? (hasPrintedQr ? "BRANDED" : "STANDARD"),
      logoRequired: hasPrintedQr,
      logoStatus: !hasPrintedQr ? "not_required" : item.logoReference ? item.logoStatus ?? "uploaded" : item.logoStatus ?? "manual_collection_required",
      logoReference: item.logoReference ?? null,
      proofRequired: hasPrintedQr,
      proofApproved: hasPrintedQr && item.proofApproved === true,
      productionStatus: isProvisioned ? item.productionStatus ?? "ready_for_direct_fulfillment" : item.productionStatus ?? "pending_manual_design_and_proof",
      manualProductionRequired: !isProvisioned || (item.optionId === "branded_qr_direct" && readProductionArtworkReference(item)?.status === "generation_failed"),
      productionWarningCodes: isProvisioned
        ? normalizeProductionWarningCodes(item.productionWarningCodes)
        : normalizeProductionWarningCodes(item.productionWarningCodes, hasPrintedQr ? ["pending_manual_proof", "do_not_print_until_manual_review"] : [])
    };
  }

  const hasLogoReference = Boolean(item.logoReference);
  const productionArtwork = readProductionArtworkReference(item);
  const isProductionReadyBranded = fulfillmentKind === "branded" && hasLogoReference && item.proofApproved === true && productionArtwork?.status === "generated";
  const hasArtworkFailure = productionArtwork?.status === "generation_failed" || item.productionStatus === "artwork_generation_failed";
  const productionStatus =
    fulfillmentKind === "custom" ? "pending_manual_design_and_proof" : "pending_manual_logo_and_proof";

  return {
    ...item,
    destinationMode: item.destinationMode ?? "DIRECT",
    customizationLevel: item.customizationLevel ?? purchaseOptionIdToCustomizationLevel(item.optionId),
    logoRequired: true,
    logoStatus: hasLogoReference ? item.logoStatus ?? "uploaded" : "manual_collection_required",
    logoReference: item.logoReference ?? null,
    proofRequired: true,
    proofApproved: item.proofApproved === true,
    productionStatus: hasArtworkFailure
      ? "artwork_generation_failed"
      : isProductionReadyBranded
      ? "ready_for_direct_fulfillment"
      : hasLogoReference && fulfillmentKind === "branded"
        ? item.productionStatus ?? "pending_branded_proof_review"
        : productionStatus,
    manualProductionRequired: !isProductionReadyBranded,
    productionWarningCodes: hasArtworkFailure
      ? normalizeProductionWarningCodes(item.productionWarningCodes, ["artwork_generation_failed", "do_not_print_until_manual_review"])
      : isProductionReadyBranded
      ? []
      : normalizeProductionWarningCodes(
          item.productionWarningCodes,
          hasLogoReference && fulfillmentKind === "branded"
            ? ["pending_manual_proof", "do_not_print_until_manual_review"]
            : ["pending_manual_proof", "asset_storage_not_configured", "do_not_print_until_manual_review"]
        )
  };
}

export function getOrderLineItemFulfillmentKind(item: OrderLineItem): OrderLineItemFulfillmentKind {
  const optionId = item.optionId?.toLowerCase() ?? "";
  const optionLabel = item.optionLabel?.toLowerCase() ?? "";
  const productionStatus = item.productionStatus?.toLowerCase() ?? "";
  const warningCodes = Array.isArray(item.productionWarningCodes) ? item.productionWarningCodes : [];
  const setup = item.setup && typeof item.setup === "object" ? item.setup : {};
  const serviceMode = readSetupString(setup, "serviceMode")?.toUpperCase();
  const serviceAddon = readSetupString(setup, "serviceAddon")?.toLowerCase();

  if (
    item.destinationMode === "HOSTED" ||
    serviceMode === "HOSTED" ||
    serviceAddon === "hosted_multilink" ||
    optionId === "hosted_multilink" ||
    optionLabel.includes("hosted multi-link")
  ) {
    return "hosted";
  }

  if (
    optionId === "custom_direct" ||
    optionLabel.includes("custom direct") ||
    productionStatus === "pending_manual_design_and_proof"
  ) {
    return "custom";
  }

  if (
    optionId === "branded_qr_direct" ||
    optionLabel.includes("branded + qr") ||
    productionStatus === "pending_branded_proof_review" ||
    productionStatus === "pending_manual_logo_and_proof"
  ) {
    return "branded";
  }

  if (item.manualProductionRequired || warningCodes.includes("pending_manual_proof")) {
    return "branded";
  }

  return "standard";
}

export function getOrderLineItemProductionSummary(item: OrderLineItem): OrderLineItemProductionSummary {
  const fulfillmentKind = getOrderLineItemFulfillmentKind(item);
  const destinationUrl = readSetupString(item.setup, "destinationUrl");
  const destinationType = readSetupString(item.setup, "destinationType");
  const platformSlug = readSetupString(item.setup, "platformSlug");
  const businessName = readSetupString(item.setup, "businessName");
  const logoMediaUrl = readSetupString(item.setup, "logoMediaUrl");
  const logoReference = item.logoReference ?? readSetupString(item.setup, "logoStorageKey") ?? logoMediaUrl;
  const directTargets = buildDirectProductionTargets(destinationUrl);
  const generatedQrValue = readSetupString(item.setup, "generatedQrValue") ?? directTargets?.qrTargetUrl;
  const qrTargetUrl = readSetupString(item.setup, "qrTargetUrl") ?? generatedQrValue ?? directTargets?.qrTargetUrl;
  const nfcTargetUrl = readSetupString(item.setup, "nfcTargetUrl") ?? directTargets?.nfcTargetUrl;
  const frontTemplateUrl = readSetupString(item.setup, "frontTemplateUrl") ?? readProofPreviewString(item.setup, "frontTemplateUrl");
  const centerAssetUrl = readSetupString(item.setup, "centerAssetUrl") ?? readProofPreviewString(item.setup, "centerAssetUrl");
  const ctaText = readSetupString(item.setup, "ctaText") ?? readSetupString(item.setup, "cta") ?? readProofPreviewString(item.setup, "ctaText");
  const productionArtwork = readProductionArtworkReference(item);

  if (fulfillmentKind === "standard") {
    const warnings = destinationUrl && nfcTargetUrl ? [] : ["Missing direct destination URL"];
    return {
      fulfillmentKind,
      optionLabel: "Standard Direct",
      nfcBehavior: "DIRECT NFC",
      printedQrLabel: "No printed QR (NFC only)",
      destinationUrl,
      destinationType,
      platformSlug,
      nfcTargetUrl,
      proofRequired: false,
      proofConfirmed: false,
      statusLabel: warnings.length ? "Needs setup review" : "Ready for direct fulfillment",
      statusTone: warnings.length ? "warning" : "ready",
      warnings
    };
  }

  if (fulfillmentKind === "hosted") {
    const hasPrintedQr = item.optionId !== "standard_direct";
    const hostedWarnings: string[] = [];
    if (hasPrintedQr && !qrTargetUrl) hostedWarnings.push("Missing hosted QR target URL");
    if (!nfcTargetUrl) hostedWarnings.push("Missing hosted NFC target URL");
    if (!readSetupString(item.setup, "hostedPageCode") && !readSetupString(item.setup, "permanentPageCode")) hostedWarnings.push("Missing permanent hosted page code");
    if (item.optionId === "branded_qr_direct") {
      if (!businessName) hostedWarnings.push("Missing business name");
      if (!logoReference) hostedWarnings.push("Missing logo");
      if (!frontTemplateUrl) hostedWarnings.push("Missing branded front template");
      if (!item.proofApproved) hostedWarnings.push("Proof not confirmed");
      if (productionArtwork?.status !== "generated") hostedWarnings.push(productionArtwork?.error ?? "Production artwork not generated");
    }

    return {
      fulfillmentKind,
      optionLabel: "Hosted Multi-Link",
      nfcBehavior: "HOSTED NFC",
      printedQrLabel: hasPrintedQr ? "HOSTED QR" : "No printed QR (NFC only)",
      destinationUrl,
      destinationType,
      platformSlug,
      businessName,
      logoMediaUrl,
      logoReference: logoReference ?? undefined,
      generatedQrValue: hasPrintedQr ? generatedQrValue : undefined,
      qrTargetUrl: hasPrintedQr ? qrTargetUrl : undefined,
      nfcTargetUrl,
      frontTemplateUrl,
      productionArtwork: hasPrintedQr ? productionArtwork : undefined,
      proofRequired: hasPrintedQr,
      proofConfirmed: hasPrintedQr && item.proofApproved === true,
      statusLabel: hostedWarnings.length === 0 ? "Ready for hosted production" : "Hosted setup pending",
      statusTone: hostedWarnings.length === 0 ? "ready" : "warning",
      warnings: hostedWarnings
    };
  }

  const warnings: string[] = [];
  const proofConfirmed = item.proofApproved === true;

  if (!destinationUrl) warnings.push("Missing destination URL");
  if (!businessName) warnings.push(fulfillmentKind === "custom" ? "Missing business name/design name" : "Missing business name");
  if (!logoReference) warnings.push(fulfillmentKind === "custom" ? "Missing logo or design asset" : "Missing logo");
  if (fulfillmentKind === "branded" && !generatedQrValue) warnings.push("Missing QR value");
  if (fulfillmentKind === "branded" && !qrTargetUrl) warnings.push("Missing QR target URL");
  if (fulfillmentKind === "branded" && !nfcTargetUrl) warnings.push("Missing NFC target URL");
  if (fulfillmentKind === "branded" && !frontTemplateUrl) warnings.push("Missing branded front template");
  if (!proofConfirmed) warnings.push("Proof not confirmed");
  if (fulfillmentKind === "branded" && productionArtwork?.status !== "generated") warnings.push(productionArtwork?.error ?? "Production artwork not generated");

  const isComplete = warnings.length === 0;

  return {
    fulfillmentKind,
    optionLabel: fulfillmentKind === "custom" ? "Custom Direct" : "Branded + QR Direct",
    nfcBehavior: "DIRECT NFC",
    printedQrLabel: "DIRECT QR",
    destinationUrl,
    destinationType,
    platformSlug,
    businessName,
    logoMediaUrl,
    logoReference: logoReference ?? undefined,
    generatedQrValue,
    qrTargetUrl,
    nfcTargetUrl,
    frontTemplateUrl,
    centerAssetUrl,
    ctaText,
    productionArtwork,
    proofRequired: true,
    proofConfirmed,
    statusLabel: isComplete
      ? fulfillmentKind === "custom"
        ? "Ready for custom production review"
        : "Ready for production review"
      : "Needs setup review",
    statusTone: isComplete ? "ready" : "warning",
    warnings
  };
}

export function getOrderProductionBlockers(order: Pick<OrderRecord, "line_items_json">): string[] {
  if (!order.line_items_json.length) return ["Order has no production line items."];
  return order.line_items_json.flatMap((item, index) =>
    getOrderLineItemProductionSummary(item).warnings.map((warning) => `Item ${index + 1} (${item.title}): ${warning}`)
  );
}

export function mapCheckoutSessionToOrderInput(session: StripeCheckoutSessionLike): OrderRecord {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const stripeCustomerId = readStripeObjectId(session.customer);
  const invoiceDetails = readInvoiceDetails(session.invoice);
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const lineItems = parseOrderLineItems(session.metadata?.order_items);
  const shippingDetails = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const shippingAddress = normalizeShippingAddress(shippingDetails, session.customer_details);
  const configuredSubtotalCents = readIntegerString(session.metadata?.total_cents);
  const taxAmountCents = readIntegerString(session.metadata?.tax_amount_cents) ?? 0;

  return {
    stripe_checkout_session_id: session.id ?? "",
    stripe_payment_intent_id: paymentIntent,
    status: session.payment_status === "paid" ? "paid" : "pending_payment",
    payment_status: session.payment_status ?? null,
    email,
    customer_name: session.customer_details?.name ?? null,
    subtotal_cents: configuredSubtotalCents ?? session.amount_subtotal ?? 0,
    total_cents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    line_items_json: lineItems,
    customer_details_json: {
      ...(session.customer_details ?? {}),
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      ...(invoiceDetails.invoiceId ? { invoice_id: invoiceDetails.invoiceId } : {}),
      ...(invoiceDetails.hostedInvoiceUrl ? { hosted_invoice_url: invoiceDetails.hostedInvoiceUrl } : {}),
      ...(invoiceDetails.invoicePdfUrl ? { invoice_pdf_url: invoiceDetails.invoicePdfUrl } : {}),
      ...(invoiceDetails.invoiceNumber ? { invoice_number: invoiceDetails.invoiceNumber } : {}),
      tax_summary: {
        mode: session.metadata?.tax_mode ?? "unknown",
        label: session.metadata?.tax_label ?? "Sales tax",
        rate_bps: readIntegerString(session.metadata?.tax_rate_bps) ?? 0,
        amount_cents: taxAmountCents,
        tax_shipping: session.metadata?.tax_shipping === "true"
      }
    },
    shipping_address_json: shippingAddress,
    shipping_amount_cents: session.shipping_cost?.amount_total ?? readIntegerString(session.metadata?.shipping_amount_cents) ?? 0,
    shipping_mode: readShippingMode(session.metadata?.shipping_mode) ?? null,
    production_status: "not_started",
    shipping_status: "not_shipped",
    shipping_method: null,
    shipping_carrier: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: null,
    internal_notes: "",
    admin_fulfillment_notes: "",
    updated_at: new Date().toISOString()
  };
}

export function parseOrderLineItems(value: string | null | undefined): OrderLineItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }

          const row = item as Partial<OrderLineItem>;
          return typeof row.productId === "string" &&
            typeof row.title === "string" &&
            typeof row.sku === "string" &&
            Number.isInteger(row.quantity) &&
            Number.isInteger(row.unitAmountCents) &&
            Number.isInteger(row.lineSubtotalCents)
            ? [
                applyOrderLineItemFulfillmentInference({
                  ...row,
                  setup: row.setup && typeof row.setup === "object" ? row.setup : undefined
                } as OrderLineItem)
              ]
            : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function normalizeOrderRecord(value: unknown): OrderRecord {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: readString(row.id),
    stripe_checkout_session_id: readString(row.stripe_checkout_session_id) ?? "",
    stripe_payment_intent_id: readString(row.stripe_payment_intent_id) ?? null,
    stripe_refund_id: readString(row.stripe_refund_id) ?? null,
    refunded_at: readString(row.refunded_at) ?? null,
    refund_status: readString(row.refund_status) ?? null,
    refunded_amount_cents: readNumber(row.refunded_amount_cents) ?? 0,
    refund_pending_amount_cents: readNumber(row.refund_pending_amount_cents) ?? 0,
    refund_failure_reason: readString(row.refund_failure_reason) ?? null,
    status: readOrderStatus(row.status) ?? "pending_payment",
    payment_status: readString(row.payment_status) ?? null,
    email: readString(row.email) ?? null,
    customer_name: readString(row.customer_name) ?? null,
    subtotal_cents: readNumber(row.subtotal_cents) ?? 0,
    total_cents: readNumber(row.total_cents) ?? 0,
    currency: readString(row.currency) ?? "usd",
    line_items_json: Array.isArray(row.line_items_json)
      ? (row.line_items_json as OrderLineItem[]).map(applyOrderLineItemFulfillmentInference)
      : [],
    customer_details_json: row.customer_details_json && typeof row.customer_details_json === "object" ? (row.customer_details_json as Record<string, unknown>) : null,
    shipping_address_json: row.shipping_address_json && typeof row.shipping_address_json === "object" ? (row.shipping_address_json as Record<string, unknown>) : null,
    shipping_amount_cents: readNumber(row.shipping_amount_cents) ?? 0,
    shipping_mode: readShippingMode(row.shipping_mode) ?? null,
    production_status: readProductionStatus(row.production_status) ?? "not_started",
    shipping_status: readShippingStatus(row.shipping_status) ?? "not_shipped",
    shipping_method: readString(row.shipping_method) ?? null,
    shipping_carrier: readString(row.shipping_carrier) ?? null,
    tracking_number: readString(row.tracking_number) ?? null,
    tracking_url: readString(row.tracking_url) ?? null,
    shipped_at: readString(row.shipped_at) ?? null,
    internal_notes: readString(row.internal_notes) ?? "",
    admin_fulfillment_notes: readString(row.admin_fulfillment_notes) ?? "",
    created_at: readString(row.created_at),
    updated_at: readString(row.updated_at)
  };
}

export function normalizeProductionWarningCodes(
  current: ManualProductionWarningCode[] | undefined,
  required: ManualProductionWarningCode[] = []
): ManualProductionWarningCode[] {
  const currentCodes = Array.isArray(current) ? current.filter(isManualProductionWarningCode) : [];
  return Array.from(new Set([...currentCodes, ...required]));
}

export function isManualProductionWarningCode(value: unknown): value is ManualProductionWarningCode {
  return (
    value === "pending_manual_proof" ||
    value === "asset_storage_not_configured" ||
    value === "artwork_generation_failed" ||
    value === "do_not_print_until_manual_review"
  );
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readSetupString(setup: Record<string, unknown> | undefined, key: string) {
  if (!setup || typeof setup !== "object") {
    return undefined;
  }

  return readString(setup[key]);
}

export function readProofPreviewString(setup: Record<string, unknown> | undefined, key: string) {
  const proofPreviewData = setup?.proofPreviewData;
  if (!proofPreviewData || typeof proofPreviewData !== "object") {
    return undefined;
  }

  return readString((proofPreviewData as Record<string, unknown>)[key]);
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readIntegerString(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return undefined;
  }

  return Number(value);
}

export function readOrderStatus(value: unknown): OrderRecord["status"] | undefined {
  return value === "pending_payment" || value === "paid" || value === "failed" || value === "canceled" ? value : undefined;
}

export function readProductionStatus(value: unknown): ProductionStatus | undefined {
  return value === "not_started" || value === "ready_for_production" || value === "in_production" || value === "blocked" || value === "completed"
    ? value
    : undefined;
}

export function readShippingStatus(value: unknown): ShippingStatus | undefined {
  return value === "not_shipped" || value === "ready_to_ship" || value === "shipped" || value === "delivered" || value === "blocked" ? value : undefined;
}

export function readShippingMode(value: unknown): "manual" | "free" | "flat" | undefined {
  return value === "manual" || value === "free" || value === "flat" ? value : undefined;
}

export function readStripeObjectId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const id = (value as Record<string, unknown>).id;
    return typeof id === "string" && id.trim() ? id : null;
  }
  return null;
}

export function readInvoiceDetails(invoice: StripeCheckoutSessionLike["invoice"]) {
  if (!invoice || typeof invoice === "string") {
    return {
      invoiceId: typeof invoice === "string" ? invoice : undefined,
      hostedInvoiceUrl: undefined,
      invoicePdfUrl: undefined,
      invoiceNumber: undefined
    };
  }

  return {
    invoiceId: typeof invoice.id === "string" ? invoice.id : undefined,
    hostedInvoiceUrl: typeof invoice.hosted_invoice_url === "string" ? invoice.hosted_invoice_url : undefined,
    invoicePdfUrl: typeof invoice.invoice_pdf === "string" ? invoice.invoice_pdf : undefined,
    invoiceNumber: typeof invoice.number === "string" ? invoice.number : undefined
  };
}

export function inferOrderProductionStatus(lineItems: OrderLineItem[]): ProductionStatus {
  if (lineItems.length === 0) return "not_started";

  const summaries = lineItems.map(getOrderLineItemProductionSummary);
  if (summaries.some((summary) => summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed")) {
    return "blocked";
  }

  return "ready_for_production";
}

export function normalizeShippingAddress(
  shippingDetails: StripeCheckoutSessionLike["shipping_details"],
  customerDetails: StripeCheckoutSessionLike["customer_details"]
): Record<string, unknown> | null {
  const address = shippingDetails?.address ?? customerDetails?.address;
  if (!address || typeof address !== "object") {
    return null;
  }

  return {
    name: shippingDetails?.name ?? customerDetails?.name ?? null,
    phone: shippingDetails?.phone ?? customerDetails?.phone ?? null,
    address
  };
}

export function normalizePrePaymentShippingAddress(shippingAddress: CheckoutShippingAddressInput): Record<string, unknown> {
  return {
    name: shippingAddress.name,
    phone: shippingAddress.phone || null,
    address: {
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postalCode,
      country: shippingAddress.country
    },
    source: "checkout_before_payment"
  };
}

export function mergeOrderDetails(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!existing && !incoming) return null;
  return {
    ...(existing ?? {}),
    ...(incoming ?? {})
  };
}
