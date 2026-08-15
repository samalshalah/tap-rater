import { describe, expect, it } from "vitest";
import {
  formatManualProductionWarning,
  formatManualRequirement,
  formatProductionStatus,
  getProductionStatusForPurchaseOption,
  isManualProductionOptionId,
  manualProductionWarningCodes,
  normalizeProductionWarningCodes
} from "@/lib/fulfillment";

describe("fulfillment helpers", () => {
  it("maps purchase options to production status without changing checkout behavior", () => {
    expect(getProductionStatusForPurchaseOption("standard_direct")).toBe("ready_for_direct_activation");
    expect(getProductionStatusForPurchaseOption("branded_qr_direct")).toBe("pending_manual_logo_and_proof");
    expect(getProductionStatusForPurchaseOption("custom_direct")).toBe("pending_manual_design_and_proof");
  });

  it("identifies manual production options", () => {
    expect(isManualProductionOptionId("standard_direct")).toBe(false);
    expect(isManualProductionOptionId("branded_qr_direct")).toBe(true);
    expect(isManualProductionOptionId("custom_direct")).toBe(true);
  });

  it("normalizes production warning codes without duplicates", () => {
    expect(normalizeProductionWarningCodes(["pending_manual_proof"], manualProductionWarningCodes)).toEqual([
      "pending_manual_proof",
      "asset_storage_not_configured",
      "do_not_print_until_manual_review"
    ]);
  });

  it("formats admin production status labels", () => {
    expect(formatProductionStatus("ready_for_direct_activation")).toBe("Ready for direct activation");
    expect(formatProductionStatus("pending_manual_logo_and_proof")).toBe("Pending manual logo collection and proof approval");
    expect(formatProductionStatus("pending_manual_design_and_proof")).toBe("Pending manual design collection and proof approval");
    expect(formatProductionStatus(undefined)).toBe("Pending review");
  });

  it("formats admin manual fulfillment labels", () => {
    expect(formatManualRequirement("standard", false)).toBe("No");
    expect(formatManualRequirement("standard", true)).toBe("Yes");
    expect(formatManualRequirement("branded", false)).toBe("Manual logo collection required");
    expect(formatManualRequirement("custom", false)).toBe("Manual design collection required");
    expect(formatManualProductionWarning("branded")).toContain("logo and business details");
    expect(formatManualProductionWarning("custom")).toContain("custom design details");
  });
});
