import { escapeHtml } from "@/lib/email";
import type { EmailTemplateSettings } from "@/lib/email-template-config";
import { formatOrderReference } from "@/lib/order-reference";
import { getOrderLineItemProductionSummary, type OrderRecord } from "@/lib/orders";

// Only web links are allowed in customer-supplied stand destinations.
export function safeEmailUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function renderCustomerOrderEmail(
  order: OrderRecord,
  template: Pick<EmailTemplateSettings, "introText" | "supportText" | "footerText">,
  billing: { invoiceNumber?: string; invoicePdfUrl?: string; hostedInvoiceUrl?: string; receiptUrl?: string },
  invoiceAttached: boolean
) {
  const e = (value: string | undefined) => escapeHtml(value ?? "");
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency.toUpperCase() }).format(cents / 100);
  const reference = formatOrderReference(order.stripe_checkout_session_id || order.id);
  const link = (label: string, value: string | undefined) => {
    const url = safeEmailUrl(value);
    return url ? `<a href="${e(url)}" style="color:#087f7a;text-decoration:underline;">${e(label)}</a>` : "";
  };
  const detail = (text: string) => `<div style="margin-top:6px;font-size:13px;line-height:20px;color:#596675;">${e(text)}</div>`;
  const items = order.line_items_json.map(item => {
    const summary = getOrderLineItemProductionSummary(item);
    const hosted = summary.fulfillmentKind === "hosted";
    const nfcOnly = item.optionId === "standard_direct" || summary.fulfillmentKind === "standard";
    const destination = hosted
      ? link("Manage your Multi-Link page", "https://taprater.com/account/stands")
      : link("View your stand’s destination", summary.destinationUrl ?? summary.nfcTargetUrl ?? undefined);
    return `<tr><td style="padding:20px 0;border-bottom:1px solid #e5e9ed;">
      <div style="font-size:16px;font-weight:700;color:#152333;">${e(item.title)} - ${e(summary.optionLabel)}</div>
      ${detail(`Quantity: ${item.quantity}`)}
      ${item.discountCents ? detail(`${item.offerLabel || "Offer"}: saved ${money(item.discountCents)}`) : ""}
      ${detail(hosted ? (nfcOnly ? "Connection: NFC opens your Multi-Link page (no printed QR)" : "Connection: QR and NFC open your Multi-Link page") : (nfcOnly ? "Connection: NFC opens the destination link directly (no printed QR)" : "Connection: QR and NFC open the destination link directly"))}
      ${summary.businessName ? detail(`Business name: ${summary.businessName}`) : ""}
      ${!nfcOnly ? detail(`Logo: ${summary.logoReference ? "Uploaded" : "Not provided"} · Artwork confirmed: ${summary.proofConfirmed ? "Yes" : "No"}`) : ""}
      ${destination ? `<div style="margin-top:10px;font-size:13px;line-height:20px;">${destination}</div>` : ""}
    </td><td width="90" valign="top" align="right" style="padding:20px 0 20px 12px;border-bottom:1px solid #e5e9ed;font-size:15px;font-weight:700;white-space:nowrap;">${e(money(item.lineSubtotalCents))}</td></tr>`;
  }).join("");
  const taxSummary = order.customer_details_json?.tax_summary;
  const recordedTax = taxSummary && typeof taxSummary === "object" ? (taxSummary as Record<string, unknown>).amount_cents : undefined;
  const tax = typeof recordedTax === "number" && Number.isFinite(recordedTax)
    ? Math.max(0, recordedTax) : Math.max(0, order.total_cents - order.subtotal_cents - order.shipping_amount_cents);
  const service = Math.max(0, order.total_cents - order.subtotal_cents - order.shipping_amount_cents - tax);
  const totalRow = (label: string, amount: number, bold = false) => `<tr><td style="padding:7px 0;${bold ? "font-weight:700;font-size:19px;" : "color:#596675;"}">${label}</td><td align="right" style="padding:7px 0;${bold ? "font-weight:700;font-size:19px;" : ""}">${e(money(amount))}</td></tr>`;
  const invoiceLink = link("View invoice", billing.hostedInvoiceUrl ?? billing.invoicePdfUrl);
  const receiptLink = link("View payment receipt", billing.receiptUrl);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Tap Rater order is confirmed</title></head>
  <body style="margin:0;padding:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#152333;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Order ${e(reference)} confirmed. ${e(money(order.total_cents))} paid. Thank you for choosing Tap Rater.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f7;"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e9ed;border-radius:16px;">
    <tr><td style="padding:28px 28px 22px;border-bottom:3px solid #e5ab35;"><span style="font-size:23px;font-weight:800;letter-spacing:1px;">TAP RATER</span><span style="color:#bd861b;font-size:18px;"> ★★★★★</span></td></tr>
    <tr><td style="padding:28px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#087f7a;">PAYMENT RECEIVED</div>
      <h1 style="font-size:29px;line-height:36px;margin:12px 0 16px;">Thank you for your order.</h1>
      <p style="font-size:15px;line-height:24px;color:#596675;margin:0 0 22px;">${e(template.introText)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf7f5;border-radius:8px;"><tr><td style="padding:16px;font-size:13px;color:#46615d;">ORDER NUMBER<br><strong style="display:block;margin-top:6px;font-size:20px;letter-spacing:1px;color:#152333;">${e(reference)}</strong></td><td align="right" style="padding:16px;color:#087f7a;font-weight:700;">Paid</td></tr></table>
      <h2 style="font-size:18px;margin:26px 0 0;">Order summary</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}</table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 22px;font-size:14px;">${totalRow("Stand subtotal", order.subtotal_cents)}${service ? totalRow("Multi-Link service · first month", service) : ""}${totalRow("Shipping", order.shipping_amount_cents)}${totalRow("Tax", tax)}${totalRow("Total paid", order.total_cents, true)}</table>
      ${service ? `<p style="font-size:13px;color:#596675;line-height:21px;">Multi-Link service renews at ${e(money(service))}/month. Manage your subscription in your account.</p>` : ""}
      <table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#087f7a" style="border-radius:8px;"><a href="https://taprater.com/account/orders" style="display:inline-block;padding:15px 24px;border:1px solid #087f7a;border-radius:8px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">View order &amp; invoice</a></td></tr></table>
      <p style="font-size:12px;color:#6b7580;line-height:19px;">Sign in with the email address used at checkout.</p>
      ${invoiceAttached ? `<div style="padding:16px;background:#f6f7f9;border-radius:8px;font-size:14px;line-height:22px;"><strong>Your invoice PDF is attached.</strong>${billing.invoiceNumber ? `<br>Invoice ${e(billing.invoiceNumber)}` : ""}<br>Keep it for your records.</div>` : ""}
      ${invoiceLink || receiptLink ? `<p style="font-size:13px;line-height:22px;">${[invoiceLink, receiptLink].filter(Boolean).join(" &nbsp;·&nbsp; ")}</p>` : ""}
      <h2 style="font-size:18px;margin:28px 0 10px;">What happens next</h2>
      <p style="font-size:14px;line-height:23px;color:#596675;margin:0;">We’ll review your order details and prepare your stand. You’ll receive a shipping update when your order is on its way.</p>
      <p style="font-size:14px;line-height:23px;color:#596675;margin:20px 0 0;">${e(template.supportText)} ${link("Contact support", "https://taprater.com/support")}</p>
    </td></tr>
    <tr><td style="padding:22px 28px;border-top:1px solid #e5e9ed;background:#fafbfc;font-size:12px;line-height:20px;color:#6b7580;">${e(template.footerText)}<br><br>${link("Shipping", "https://taprater.com/shipping")} &nbsp;·&nbsp; ${link("Refund policy", "https://taprater.com/refund-policy")} &nbsp;·&nbsp; ${link("Terms", "https://taprater.com/terms")}</td></tr>
  </table></td></tr></table></body></html>`;
}
