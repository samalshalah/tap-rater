import { describe, expect, it } from "vitest";
import { resolveShippingRecipientName } from "@/components/checkout/shipping-recipient";

describe("shipping recipient suggestion", () => {
  it("follows every character typed into the customer name", () => {
    let customerName = "";
    let shippingName = "";

    for (const character of "Phase Three") {
      const nextName = customerName + character;
      shippingName = resolveShippingRecipientName(shippingName, customerName, nextName);
      customerName = nextName;
      expect(shippingName).toBe(nextName);
    }
  });

  it("follows edits and deletion while both names still match", () => {
    expect(resolveShippingRecipientName("Phase Three", "Phase Three", "Phase Thre")).toBe("Phase Thre");
    expect(resolveShippingRecipientName("Phase Three", "Phase Three", "")).toBe("");
  });

  it("copies a pasted or autofilled name into an empty recipient", () => {
    expect(resolveShippingRecipientName("", "", "Phase Three")).toBe("Phase Three");
  });

  it("updates a prefilled account name when the customer corrects it", () => {
    expect(resolveShippingRecipientName("Phase Three", "Phase Three", "Phase Three QA")).toBe("Phase Three QA");
  });

  it("does not overwrite a different shipping recipient", () => {
    expect(resolveShippingRecipientName("Receiving Desk", "Phase Three", "Phase Three QA")).toBe("Receiving Desk");
    expect(resolveShippingRecipientName("Receiving Desk", "Phase Three", "")).toBe("Receiving Desk");
  });
});
