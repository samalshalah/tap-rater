import type { PurchaseOptionId } from "@/lib/purchase-options";

export type ManualProductionWarningCode =
  | "pending_manual_proof"
  | "asset_storage_not_configured"
  | "do_not_print_until_manual_review";

export type ProductionStatus =
  | "ready_for_direct_activation"
  | "pending_manual_logo_and_proof"
  | "pending_manual_design_and_proof";

export type OrderLineItemFulfillmentKind = "standard" | "branded" | "custom";

export const manualProductionWarningCodes: ManualProductionWarningCode[] = [
  "pending_manual_proof",
  "asset_storage_not_configured",
  "do_not_print_until_manual_review"
];

export function isManualProductionOptionId(optionId: string | undefined): optionId is "branded_qr_direct" | "custom_direct" {
  return optionId === "branded_qr_direct" || optionId === "custom_direct";
}

export function getProductionStatusForPurchaseOption(optionId: PurchaseOptionId): ProductionStatus {
  if (optionId === "custom_direct") {
    return "pending_manual_design_and_proof";
  }

  if (optionId === "branded_qr_direct") {
    return "pending_manual_logo_and_proof";
  }

  return "ready_for_direct_activation";
}

export function normalizeProductionWarningCodes(
  current: ManualProductionWarningCode[] | undefined,
  required: ManualProductionWarningCode[] = []
): ManualProductionWarningCode[] {
  const currentCodes = Array.isArray(current) ? current.filter(isManualProductionWarningCode) : [];
  return Array.from(new Set([...currentCodes, ...required]));
}

export function isManualProductionWarningCode(value: unknown): value is ManualProductionWarningCode {
  return value === "pending_manual_proof" || value === "asset_storage_not_configured" || value === "do_not_print_until_manual_review";
}

export function formatProductionStatus(status: string | undefined) {
  if (status === "ready_for_direct_activation") return "Ready for direct activation";
  if (status === "pending_manual_logo_and_proof") return "Pending manual logo collection and proof approval";
  if (status === "pending_manual_design_and_proof") return "Pending manual design collection and proof approval";
  return "Pending review";
}

export function formatManualRequirement(fulfillmentKind: OrderLineItemFulfillmentKind, logoRequired: boolean | undefined) {
  if (fulfillmentKind === "custom") return "Manual design collection required";
  if (fulfillmentKind === "branded") return "Manual logo collection required";
  return logoRequired ? "Yes" : "No";
}

export function formatManualProductionWarning(fulfillmentKind: OrderLineItemFulfillmentKind) {
  if (fulfillmentKind === "custom") {
    return "Collect/confirm custom design details before printing. Do not print until proof is approved.";
  }

  return "Collect/confirm logo and business details before printing. Do not print until proof is approved.";
}
