import { z } from "zod";
import type { MigratedProduct } from "@/data/migrated-products";
import type { OrderRecord } from "@/lib/orders";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { generateProductVariantSku, getProductBaseSku } from "@/lib/product-model";
import { checkoutCustomerSchema, checkoutShippingAddressSchema } from "@/lib/validators";

export const complimentaryDesignSchema = z.object({
  fontSizePercent: z.number().int().min(75).max(160).default(100),
  logoSizePercent: z.number().int().min(75).max(160).default(100),
  logoOffsetXPercent: z.number().int().min(-20).max(20).default(0),
  logoOffsetYPercent: z.number().int().min(-20).max(20).default(0),
  logoFitMode: z.enum(["contain", "fill"]).default("contain"),
  showBusinessNameOnProof: z.boolean().default(true)
});

export const complimentaryOrderSchema = z.object({
  requestId: z.string().uuid(),
  customer: checkoutCustomerSchema,
  productId: z.string().min(1),
  optionId: z.enum(["standard_direct", "branded_qr_direct"]),
  quantity: z.number().int().min(1).max(100),
  businessName: z.string().trim().min(1).max(120),
  destinationUrl: z.string().trim().url().max(2048).refine(v => /^https?:\/\//i.test(v), "Use an http or https link."),
  logoStorageKey: z.string().max(500).optional(),
  design: complimentaryDesignSchema.optional(),
  reason: z.string().trim().min(3).max(1000),
  delivery: z.enum(["free_shipping", "pickup"]),
  shippingAddress: checkoutShippingAddressSchema.optional()
}).superRefine((v, ctx) => {
  if (v.delivery === "free_shipping" && !v.shippingAddress) ctx.addIssue({ code: "custom", path: ["shippingAddress"], message: "Enter a shipping address." });
  if (v.optionId === "branded_qr_direct" && !v.logoStorageKey) ctx.addIssue({ code: "custom", path: ["logoStorageKey"], message: "Upload a logo for a branded stand." });
});

export function complimentaryCatalog(products: MigratedProduct[]) {
  return products.filter(p => p.format === "stand" && p.isActive && p.status !== "draft" && p.status !== "archived" && p.stockStatus === "instock" && p.checkoutMode === "buy_now")
    .map(p => ({ product: p, options: getProductPurchaseOptions(p).filter(o => !o.requiresSubscription && (o.id === "standard_direct" || (o.id === "branded_qr_direct" && Boolean(p.assetSet?.brandedFrontTemplateUrl)))) }))
    .filter(p => p.options.length > 0);
}

export function buildComplimentaryOrder(input: z.infer<typeof complimentaryOrderSchema>, products: MigratedProduct[]): OrderRecord {
  const entry = complimentaryCatalog(products).find(p => p.product.slug === input.productId);
  const option = entry?.options.find(o => o.id === input.optionId);
  if (!entry || !option) throw new Error("Choose an available stand and option from the existing catalog.");
  const p = entry.product;
  const branded = input.optionId === "branded_qr_direct";
  const address = input.shippingAddress;
  return {
    stripe_checkout_session_id: `comp_${input.requestId}`,
    // Existing schema uses paid for settled orders; payment_status distinguishes gifts from paid sales.
    status: "paid", payment_status: "complimentary",
    email: input.customer.email, customer_name: input.customer.name,
    subtotal_cents: 0, total_cents: 0, shipping_amount_cents: 0, currency: "usd",
    shipping_mode: "free", shipping_method: input.delivery === "pickup" ? "Pickup" : "Complimentary shipping",
    customer_details_json: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone, source: "admin_complimentary", complimentary_reason: input.reason, delivery: input.delivery },
    shipping_address_json: address && input.delivery === "free_shipping" ? { name: address.name, phone: address.phone, address: { line1: address.line1, line2: address.line2, city: address.city, state: address.state, postal_code: address.postalCode, country: address.country } } : null,
    production_status: branded ? "not_started" : "ready_for_production", shipping_status: "not_shipped",
    internal_notes: `Complimentary order — ${input.reason}`, admin_fulfillment_notes: "",
    updated_at: new Date().toISOString(),
    line_items_json: [{
      productId: p.slug, title: p.title, optionId: option.id, optionLabel: option.label,
      baseSku: getProductBaseSku(p), sku: generateProductVariantSku(p, { purchaseOptionId: option.id }),
      quantity: input.quantity, unitAmountCents: 0, lineSubtotalCents: 0,
      destinationMode: "DIRECT", customizationLevel: branded ? "BRANDED" : "STANDARD",
      logoRequired: branded, logoStatus: branded ? "uploaded" : "not_required", logoReference: branded ? input.logoStorageKey : null,
      proofRequired: branded, proofApproved: false, manualProductionRequired: branded,
      productionStatus: branded ? "pending_branded_proof_review" : "ready_for_direct_fulfillment",
      productionWarningCodes: branded ? ["pending_manual_proof", "do_not_print_until_manual_review"] : [],
      setup: { ...input.design, productSlug: p.slug, optionCode: option.id, businessName: input.businessName, destinationUrl: input.destinationUrl,
        nfcTargetUrl: input.destinationUrl, qrTargetUrl: branded ? input.destinationUrl : undefined,
        generatedQrValue: branded ? input.destinationUrl : undefined, hasQr: branded, nfcOnly: !branded,
        logoStorageKey: branded ? input.logoStorageKey : undefined,
        logoMediaUrl: branded ? `/api/media/product/${input.logoStorageKey}` : undefined,
        frontTemplateUrl: branded ? p.assetSet?.brandedFrontTemplateUrl : p.assetSet?.standardFrontTemplateUrl,
        source: "admin_complimentary", catalogUnitAmountCents: option.priceCents }
    }]
  };
}

export const changeComplimentaryStandSchema = z.object({
  expectedUpdatedAt: z.string().min(1),
  productId: complimentaryOrderSchema.innerType().shape.productId,
  optionId: complimentaryOrderSchema.innerType().shape.optionId,
  businessName: complimentaryOrderSchema.innerType().shape.businessName,
  destinationUrl: complimentaryOrderSchema.innerType().shape.destinationUrl,
  logoStorageKey: complimentaryOrderSchema.innerType().shape.logoStorageKey,
  design: complimentaryOrderSchema.innerType().shape.design
}).superRefine((v, ctx) => {
  if (v.optionId === "branded_qr_direct" && !v.logoStorageKey) ctx.addIssue({ code: "custom", path: ["logoStorageKey"], message: "Upload a logo for a branded stand." });
});

export function canChangeComplimentaryStand(order: OrderRecord) {
  return order.status === "paid" && order.payment_status === "complimentary"
    && order.total_cents === 0 && Boolean(order.updated_at)
    && !order.stripe_refund_id && !order.refund_status && !order.shipped_at
    && ["not_started", "ready_for_production", "blocked"].includes(order.production_status)
    && ["not_shipped", "blocked"].includes(order.shipping_status)
    && !order.tracking_number && order.line_items_json.length === 1;
}

export function buildComplimentaryStandChange(order: OrderRecord, input: z.infer<typeof changeComplimentaryStandSchema>, products: MigratedProduct[]) {
  const replacement = buildComplimentaryOrder({
    ...input, requestId: "unused", customer: { name: order.customer_name ?? "Client", email: order.email ?? "", phone: "", createAccount: false },
    quantity: order.line_items_json[0].quantity, reason: "Stand change", delivery: "pickup"
  }, products);
  return {
    line_items_json: replacement.line_items_json,
    production_status: replacement.production_status,
    internal_notes: `${order.internal_notes || ""}\nStand changed from ${order.line_items_json[0].title} to ${replacement.line_items_json[0].title} on ${replacement.updated_at}. Previous artwork approval cleared.`,
    updated_at: replacement.updated_at
  };
}
