import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid order." }, { status: 400, headers });
  try {
    const portal = await getCustomerPortal(auth.session.email);
    const order = portal.orders.find(candidate => candidate.id === id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404, headers });
    const url = portal.invoices.find(invoice => invoice.orderId === id)?.invoicePdfUrl ?? order.invoicePdfUrl ?? "";
    if (!url) return NextResponse.json({ error: "A PDF invoice is not available for this order yet." }, { status: 404, headers });
    const parsed = new URL(url);
    if (!/(^|\.)stripe\.com$/i.test(parsed.hostname)) return NextResponse.json({ error: "This invoice cannot be downloaded securely." }, { status: 422, headers });
    const response = await fetch(parsed, { cache: "no-store" });
    if (!response.ok || !response.body || !response.headers.get("content-type")?.toLowerCase().includes("pdf")) throw new Error("Invoice PDF unavailable");
    return new NextResponse(response.body, { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=\"Tap-Rater-Invoice-${formatOrderReference(order.reference)}.pdf\"` } });
  } catch {
    return NextResponse.json({ error: "The invoice could not be downloaded. Please try again shortly." }, { status: 503, headers });
  }
}
