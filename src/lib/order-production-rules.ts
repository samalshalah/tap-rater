import type { CheckoutCartRow, ManualProductionWarningCode } from "@/lib/checkout";
import { buildDirectProductionTargets } from "@/lib/direct-production";
import { purchaseOptionIdToCustomizationLevel } from "@/lib/product-model";
import {
  readProductionArtworkReference
} from "@/lib/production-artwork";
import type { CheckoutShippingAddressInput } from "@/lib/validators";
import type { OrderLineItem, OrderLineItemFulfillmentKind, OrderLineItemProductionSummary, OrderRecord, ProductionStatus, ShippingStatus, StripeCheckoutSessionLike } from "./order-types";
import { normalizeProductionWarningCodes, isManualProductionWarningCode, readString, readSetupString, readProofPreviewString, readNumber, readIntegerString, readOrderStatus, readProductionStatus, readShippingStatus, readShippingMode, readStripeObjectId, readInvoiceDetails, normalizeShippingAddress, normalizePrePaymentShippingAddress, mergeOrderDetails } from "./order-value-readers";

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

export function inferOrderProductionStatus(lineItems: OrderLineItem[]): ProductionStatus {
  if (lineItems.length === 0) return "not_started";

  const summaries = lineItems.map(getOrderLineItemProductionSummary);
  if (summaries.some((summary) => summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed")) {
    return "blocked";
  }

  return "ready_for_production";
}
