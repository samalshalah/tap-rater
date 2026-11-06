import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { getAdminOrderById } from "@/lib/orders";
import { formatOrderReference } from "@/lib/order-reference";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  await requireAdmin();
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  try {
    const { order } = await getAdminOrderById(id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const details = order.customer_details_json ?? {};
    const { data: billingInvoice } = await getSupabaseAdmin().from("billing_invoices").select("invoice_pdf_url").eq("order_id", id).maybeSingle();
    const url = typeof details.invoice_pdf_url === "string" ? details.invoice_pdf_url : typeof billingInvoice?.invoice_pdf_url === "string" ? billingInvoice.invoice_pdf_url : "";
    if (!url) return NextResponse.json({ error: "A PDF invoice is not available for this order." }, { status: 404 });
    const parsed = new URL(url);
    if (!/(^|\.)stripe\.com$/i.test(parsed.hostname)) return NextResponse.json({ error: "This invoice cannot be downloaded securely." }, { status: 422 });
    const response = await fetch(parsed, { cache: "no-store" });
    if (!response.ok || !response.body || !response.headers.get("content-type")?.toLowerCase().includes("pdf")) throw new Error("Invoice PDF unavailable");
    return new NextResponse(response.body, { headers: { "Cache-Control": "private, no-store", "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=\"Tap-Rater-Invoice-${formatOrderReference(order.stripe_checkout_session_id || order.id)}.pdf\"` } });
  } catch {
    return NextResponse.json({ error: "The invoice could not be downloaded. Please try again shortly." }, { status: 503 });
  }
}
