export type OrderLineItem = {
  productId: string;
  optionId?: string;
  optionLabel?: string;
  title: string;
  sku: string;
  quantity: number;
  unitAmountCents: number;
  lineSubtotalCents: number;
  setup?: Record<string, unknown>;
  logoRequired?: boolean;
  logoStatus?: "not_required" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired?: boolean;
  proofApproved?: boolean;
  productionStatus?: "ready_for_direct_activation" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof";
  readyForPrint?: boolean;
};

// The actual enforcement of "Do not allow 'ready for print' unless
// required logo/proof data is complete." A line item can be marked ready
// for print only when every piece of data it actually requires is present
// -- a required logo has been recorded, and a required proof has been
// approved. Items that don't require either (the free/basic tier) are
// always print-ready. This is checked server-side in the update API route
// (not just disabled in the UI, since UI-only gating can't be trusted for
// something a customer's physical order depends on), and also used
// client-side to disable the button before a request is even made.
export function canMarkLineItemReadyForPrint(item: Pick<OrderLineItem, "logoRequired" | "logoReference" | "proofRequired" | "proofApproved">): boolean {
  const logoSatisfied = !item.logoRequired || Boolean(item.logoReference && item.logoReference.trim());
  const proofSatisfied = !item.proofRequired || item.proofApproved === true;
  return logoSatisfied && proofSatisfied;
}
