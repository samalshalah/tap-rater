import type { ManualProductionWarningCode } from "@/lib/checkout";
import { type CustomizationLevel, type DestinationMode } from "@/lib/product-model";
import {
  type ProductionArtworkReference
} from "@/lib/production-artwork";
import { sendShippingNotificationEmail } from "@/lib/shipping-emails";
export type OrdersDbClient = {
  from: (table: string) => any;
};

export type OrderLineItem = {
  standLineId?: string;
  productId: string;
  optionId?: string;
  optionLabel?: string;
  destinationMode?: DestinationMode;
  customizationLevel?: CustomizationLevel;
  title: string;
  baseSku?: string;
  sku: string;
  quantity: number;
  unitAmountCents: number;
  monthlyAmountCents?: number;
  lineSubtotalCents: number;
  discountCents?: number;
  offerId?: string;
  offerLabel?: string;
  setup?: Record<string, unknown>;
  logoRequired?: boolean;
  logoStatus?: "not_required" | "uploaded" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired?: boolean;
  proofApproved?: boolean;
  productionStatus?: "ready_for_direct_fulfillment" | "ready_for_direct_activation" | "pending_branded_proof_review" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof" | "artwork_generation_failed";
  manualProductionRequired?: boolean;
  productionWarningCodes?: ManualProductionWarningCode[];
};

export type OrderLineItemFulfillmentKind = "standard" | "branded" | "custom" | "hosted";

export type OrderLineItemProductionSummary = {
  fulfillmentKind: OrderLineItemFulfillmentKind;
  optionLabel: string;
  nfcBehavior: "DIRECT NFC" | "HOSTED NFC";
  printedQrLabel: "DIRECT QR" | "HOSTED QR" | "No printed QR (NFC only)";
  destinationUrl?: string;
  destinationType?: string;
  platformSlug?: string;
  businessName?: string;
  logoMediaUrl?: string;
  logoReference?: string;
  generatedQrValue?: string;
  qrTargetUrl?: string;
  nfcTargetUrl?: string;
  frontTemplateUrl?: string;
  centerAssetUrl?: string;
  ctaText?: string;
  productionArtwork?: ProductionArtworkReference;
  proofRequired: boolean;
  proofConfirmed: boolean;
  statusLabel: string;
  statusTone: "ready" | "warning" | "neutral";
  warnings: string[];
};

export type ProductionStatus = "not_started" | "ready_for_production" | "in_production" | "blocked" | "completed";

export type ShippingStatus = "not_shipped" | "ready_to_ship" | "shipped" | "delivered" | "blocked";

export type OrderRecord = {
  id?: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id?: string | null;
  stripe_refund_id?: string | null;
  refunded_at?: string | null;
  refund_status?: string | null;
  refunded_amount_cents?: number;
  refund_pending_amount_cents?: number;
  refund_failure_reason?: string | null;
  status: "pending_payment" | "paid" | "failed" | "canceled";
  payment_status?: string | null;
  email?: string | null;
  customer_name?: string | null;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  line_items_json: OrderLineItem[];
  customer_details_json?: Record<string, unknown> | null;
  shipping_address_json?: Record<string, unknown> | null;
  shipping_amount_cents: number;
  shipping_mode?: "manual" | "free" | "flat" | null;
  production_status: ProductionStatus;
  shipping_status: ShippingStatus;
  shipping_method?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  internal_notes: string;
  admin_fulfillment_notes: string;
  created_at?: string;
  updated_at?: string;
};

export type PaidOrderSaveResult =
  | {
      ok: true;
      order: OrderRecord;
      wasAlreadyPaid: boolean;
      paymentReversed?: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type CheckoutPaymentFailureStatus = "failed" | "canceled";

export type OrderRefundSaveResult =
  | { ok: true }
  | { ok: false; error: string };

export type FulfillmentUpdateResult =
  | {
      ok: true;
      shippingEmail?: Awaited<ReturnType<typeof sendShippingNotificationEmail>>;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

export type AdminOrderProductionActionInput = {
  action: "approve_proof_manually" | "regenerate_artwork" | "request_customer_changes";
  note?: string;
};

export type AdminOrderProductionActionResult =
  | {
      ok: true;
      order: OrderRecord;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

export type StripeCheckoutSessionLike = {
  id?: string | null;
  mode?: string | null;
  customer?: string | { id?: string | null } | null;
  subscription?: string | { id?: string | null; status?: string | null; current_period_end?: number | null; cancel_at_period_end?: boolean | null } | null;
  payment_intent?: string | { id?: string | null } | null;
  payment_status?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    address?: unknown;
    payment_method_details?: Record<string, unknown>;
    stripe_customer_id?: string | null;
    hosted_invoice_url?: string | null;
    invoice_pdf_url?: string | null;
    invoice_number?: string | null;
    receipt_url?: string | null;
  } | null;
  invoice?: string | { id?: string | null; hosted_invoice_url?: string | null; invoice_pdf?: string | null; number?: string | null } | null;
  shipping_details?: {
    name?: string | null;
    phone?: string | null;
    address?: unknown;
  } | null;
  shipping_cost?: {
    amount_total?: number | null;
  } | null;
  collected_information?: {
    shipping_details?: {
      name?: string | null;
      phone?: string | null;
      address?: unknown;
    } | null;
  } | null;
  metadata?: Record<string, string | null> | null;
};
