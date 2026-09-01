import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { buildCurrentApprovalSnapshot } from "@/lib/production-artwork";
import { buildProofApprovalSnapshot } from "@/lib/direct-production";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { applyOrderLineItemFulfillmentInference, getOrderLineItemProductionSummary, type OrderLineItem, type ProductionStatus } from "@/lib/orders";
import { sendRequestNotification } from "@/lib/request-notifications";

type ProofAction = "approve" | "request_change";

export async function POST(request: Request) {
  const { response, session } = await requireCustomerApi();
  if (response) return response;

  const payload = await request.json().catch(() => null);
  const orderId = readString(payload, "orderId");
  const lineItemIndex = readInteger(payload, "lineItemIndex");
  const action = readString(payload, "action") as ProofAction | undefined;
  const note = readString(payload, "note") ?? "";

  if (!orderId || lineItemIndex === undefined || (action !== "approve" && action !== "request_change")) {
    return NextResponse.json({ error: "Please check the proof action details." }, { status: 400 });
  }

  if (action === "request_change" && note.trim().length < 3) {
    return NextResponse.json({ error: "Please add a short note for the proof change." }, { status: 400 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Proof actions are not configured yet." }, { status: 503 });
  }

  const client = getSupabaseAdmin();
  const { data: order, error: orderError } = await client
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order was not found." }, { status: 404 });
  }

  const orderEmail = typeof order.email === "string" ? order.email.trim().toLowerCase() : "";
  if (orderEmail !== session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Order was not found." }, { status: 404 });
  }

  const currentLineItems: OrderLineItem[] = Array.isArray(order.line_items_json) ? order.line_items_json.map(normalizeLineItem) : [];
  const currentItem = currentLineItems[lineItemIndex];
  if (!currentItem) {
    return NextResponse.json({ error: "Stand was not found." }, { status: 404 });
  }

  const currentSummary = getOrderLineItemProductionSummary(currentItem);
  if (!currentSummary.proofRequired) {
    return NextResponse.json({ error: "This stand does not require proof approval." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updatedLineItems: OrderLineItem[] = currentLineItems.map((item: OrderLineItem, index: number) => {
    if (index !== lineItemIndex) return item;

    if (action === "approve") {
      return applyOrderLineItemFulfillmentInference({
        ...item,
        proofApproved: true,
        setup: {
          ...item.setup,
          proofApprovalSnapshot: buildProofApprovalSnapshot(buildCurrentApprovalSnapshot(item)),
          proofApprovedAt: now,
          customerProofApprovedAt: now,
          customerProofChangeRequestedAt: undefined,
          customerProofChangeNote: undefined
        }
      });
    }

    return applyOrderLineItemFulfillmentInference({
      ...item,
      proofApproved: false,
      productionStatus: "pending_branded_proof_review",
      manualProductionRequired: true,
      productionWarningCodes: ["pending_manual_proof", "do_not_print_until_manual_review"],
      setup: {
        ...item.setup,
        customerProofChangeRequestedAt: now,
        customerProofChangeNote: note.trim()
      }
    });
  });

  const productionStatus = action === "request_change" ? "blocked" : inferProductionStatus(updatedLineItems);
  const customerNote = formatCustomerProofNote(action, lineItemIndex, currentItem.title, note, now);
  const internalNotes = appendNote(typeof order.internal_notes === "string" ? order.internal_notes : "", customerNote);

  const { error: updateError } = await client
    .from("orders")
    .update({
      line_items_json: updatedLineItems,
      production_status: productionStatus,
      internal_notes: internalNotes,
      updated_at: now
    })
    .eq("id", orderId);

  if (updateError) {
    return NextResponse.json({ error: "Proof action could not be saved." }, { status: 500 });
  }

  if (action === "request_change") {
    await sendRequestNotification({
      subject: "Customer requested proof changes",
      rows: {
        Email: session.email,
        Order: typeof order.stripe_checkout_session_id === "string" ? order.stripe_checkout_session_id : orderId,
        Stand: currentItem.title,
        Note: note.trim()
      }
    });
  }

  return NextResponse.json({
    ok: true,
    proofStatus: action === "approve" ? "approved" : "needs_review",
    productionStatus
  });
}

function normalizeLineItem(item: unknown): OrderLineItem {
  return applyOrderLineItemFulfillmentInference(item && typeof item === "object" ? (item as OrderLineItem) : ({
    productId: "unknown",
    title: "Configured stand",
    sku: "unknown",
    quantity: 1,
    unitAmountCents: 0,
    lineSubtotalCents: 0
  } satisfies OrderLineItem));
}

function inferProductionStatus(items: OrderLineItem[]): ProductionStatus {
  if (!items.length) return "not_started";
  const summaries = items.map(getOrderLineItemProductionSummary);
  return summaries.some((summary) => summary.warnings.length > 0 || summary.productionArtwork?.status === "generation_failed")
    ? "blocked"
    : "ready_for_production";
}

function readString(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readInteger(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function appendNote(existing: string, note: string) {
  return [existing.trim(), note].filter(Boolean).join("\n\n");
}

function formatCustomerProofNote(action: ProofAction, lineItemIndex: number, title: string, note: string, timestamp: string) {
  const label = action === "approve" ? "Customer approved proof." : "Customer requested proof changes.";
  const cleanNote = note.trim();
  const header = `[${timestamp}] ${label} Line ${lineItemIndex + 1}: ${title}`;
  return cleanNote ? `${header}\n${cleanNote}` : header;
}
