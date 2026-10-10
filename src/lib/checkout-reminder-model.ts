import { z } from "zod";
import type { OrderRecord } from "@/lib/orders";

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  firstHours: z.number().int().min(1).max(48),
  secondHours: z.number().int().min(2).max(120),
  thirdEnabled: z.boolean(),
  thirdHours: z.number().int().min(3).max(168),
}).refine(v => v.secondHours > v.firstHours && v.thirdHours > v.secondHours,
  "Reminder times must be in increasing order.");
export const defaultReminderSettings = { enabled: true, firstHours: 2, secondHours: 24, thirdEnabled: false, thirdHours: 72 };
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;
export const reminderDraftSchema = z.object({
  subject: z.string().trim().min(1).max(180).refine(v => !/[\r\n]/.test(v)),
  message: z.string().trim().min(1).max(2000),
  legacyApproved: z.boolean().default(false),
});
export function unpaidRecoverable(order: OrderRecord) {
  return !!order.email && !order.stripe_payment_intent_id &&
    (order.status === "pending_payment" || (order.status === "canceled" && order.payment_status === "expired")) &&
    ["unpaid", "manual_unpaid", "expired", null, undefined].includes(order.payment_status) &&
    !order.refund_status && !order.stripe_refund_id && order.total_cents > 0;
}
export function personalInvitation(order: Pick<OrderRecord, "customer_name">) {
  const name = order.customer_name?.trim().split(/\s+/)[0] || "there";
  return { subject: "You can now complete your Tap Rater order",
    message: `Hi ${name},\n\nThank you for your patience. When you placed your order, our online payment setup wasn’t ready. We’re sorry for the inconvenience.\n\nYou can now securely complete payment using the button below. Please review your saved order details before paying.\n\nIf you have any questions or need changes, simply reply to this email.\n\nThank you,\nTap Rater` };
}
export function reminderCopy(stage: number) {
  return stage === 1 ? { subject: "Your Tap Rater order is waiting", message: "Your stand designs and order details are saved. Review your order and complete payment whenever you’re ready. Questions? Just reply—we’re happy to help." }
    : stage === 2 ? { subject: "Need help completing your Tap Rater order?", message: "Your order is still awaiting payment. If you need help with your design or checkout, reply to this email. You can also return to your saved order using the button below." }
    : { subject: "A final reminder about your Tap Rater order", message: "This is our final reminder about your saved order. If you’re ready, you can review the details and complete payment below. Thank you for considering Tap Rater." };
}
