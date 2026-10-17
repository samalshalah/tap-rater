import { Resend } from "resend";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getEmailDeliveryByIdWithClient } from "@/lib/email-deliveries";
import { getAdminOrderById } from "@/lib/orders";
import { getEmailTemplate } from "@/lib/email-templates";
import { buildAdminPaidOrderEmailHtml, buildCustomerPaidOrderEmailHtml } from "@/lib/order-emails";
import { buildShippingNotificationEmailHtml } from "@/lib/shipping-emails";

export async function getAdminEmailPreview(id: string) {
  if (!hasSupabaseAdminConfig()) return null;
  const delivery = await getEmailDeliveryByIdWithClient(getSupabaseAdmin(), id);
  if (!delivery) return null;
  const metadata = { subject: delivery.subject, recipient: delivery.recipient, status: delivery.status };
  if (delivery.providerMessageId && process.env.RESEND_API_KEY) {
    try {
      const { data } = await new Resend(process.env.RESEND_API_KEY).emails.get(delivery.providerMessageId);
      if (data?.html || data?.text) return { ...metadata, html: data.html || "", text: data.text || "", source: "original" as const };
    } catch {
      // Older messages and send-only API keys may not support retrieval.
    }
  }
  if (delivery.entityType === "order" && delivery.entityId) {
    const { order } = await getAdminOrderById(delivery.entityId);
    if (order) {
      let html = "";
      if (delivery.messageType === "paid_order_customer") html = buildCustomerPaidOrderEmailHtml(order, await getEmailTemplate("customer-order-confirmation"));
      if (delivery.messageType === "paid_order_admin") html = buildAdminPaidOrderEmailHtml(order, await getEmailTemplate("admin-new-order"));
      if (delivery.messageType === "shipping_tracking_customer") html = buildShippingNotificationEmailHtml(order, await getEmailTemplate("shipping-tracking"));
      if (html) return { ...metadata, html, text: "", source: "reconstructed" as const };
    }
  }
  return { ...metadata, html: "", text: "", source: "unavailable" as const };
}
