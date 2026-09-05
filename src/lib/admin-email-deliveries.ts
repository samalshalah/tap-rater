import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import {
  getEmailDeliveryByIdWithClient,
  isRetryableEmailStatus,
  type EmailDeliveryDbClient,
  type EmailDeliveryRecord
} from "@/lib/email-deliveries";
import { getCustomerReplyToEmail, sendEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import {
  defaultEmailTemplates,
  getEmailTemplate,
  type EmailTemplateKey,
  type EmailTemplateSettings
} from "@/lib/email-templates";
import { buildAdminPaidOrderEmailHtml, buildCustomerPaidOrderEmailHtml } from "@/lib/order-emails";
import { getAdminOrderById, type OrderRecord } from "@/lib/orders";
import { buildShippingNotificationEmailHtml } from "@/lib/shipping-emails";

export type AdminEmailRetryResult =
  | { ok: true }
  | { ok: false; error: string; status: number; retryAfterSeconds?: number };

type AdminEmailRetryDependencies = {
  now?: Date;
  getOrderFn?: (id: string) => Promise<OrderRecord | null>;
  getTemplateFn?: (key: EmailTemplateKey) => Promise<EmailTemplateSettings>;
  sendEmailFn?: (input: SendEmailInput) => Promise<EmailResult>;
};

const maxEmailAttempts = 5;
const retryCooldownMs = 60 * 1000;

export async function retryAdminEmailDelivery(id: string): Promise<AdminEmailRetryResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Email delivery storage is not configured.", status: 503 };
  }

  return retryAdminEmailDeliveryWithClient(getSupabaseAdmin() as EmailDeliveryDbClient, id);
}

export async function retryAdminEmailDeliveryWithClient(
  client: EmailDeliveryDbClient,
  id: string,
  dependencies: AdminEmailRetryDependencies = {}
): Promise<AdminEmailRetryResult> {
  const now = dependencies.now ?? new Date();
  const delivery = await getEmailDeliveryByIdWithClient(client, id);
  if (!delivery) return { ok: false, error: "Email delivery attempt was not found.", status: 404 };
  if (!delivery.retryable || !isRetryableEmailStatus(delivery.status)) {
    return { ok: false, error: "This email attempt cannot be retried from the delivery log.", status: 409 };
  }
  if (delivery.attemptNumber >= maxEmailAttempts) {
    return { ok: false, error: "This email has reached the retry limit.", status: 409 };
  }

  const retryAfterSeconds = getRetryCooldownSeconds(delivery.updatedAt, now);
  if (retryAfterSeconds > 0) {
    return {
      ok: false,
      error: "Wait one minute after a failed attempt before retrying.",
      status: 429,
      retryAfterSeconds
    };
  }

  if (delivery.entityType !== "order" || !delivery.entityId) {
    return { ok: false, error: "This email does not have a retryable source record.", status: 409 };
  }

  const getOrderFn = dependencies.getOrderFn ?? getOrderForRetry;
  const order = await getOrderFn(delivery.entityId);
  if (!order) return { ok: false, error: "The source order was not found.", status: 404 };

  const retryInput = await buildOrderRetryInput(delivery, order, dependencies.getTemplateFn ?? getEmailTemplate);
  if (!retryInput.ok) return retryInput;

  const { data: claimed, error: claimError } = await client
    .from("email_deliveries")
    .update({ status: "retrying", updated_at: now.toISOString() })
    .eq("id", id)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (claimError) return { ok: false, error: "The email retry could not be started.", status: 500 };
  if (!claimed?.id) return { ok: false, error: "Another retry is already in progress.", status: 409 };

  const sendEmailFn = dependencies.sendEmailFn ?? sendEmail;
  let result: EmailResult;
  try {
    result = await sendEmailFn(retryInput.input);
  } catch {
    await restoreFailedRetry(client, id, now);
    return { ok: false, error: "The email retry could not be completed.", status: 502 };
  }

  const { error: finishError } = await client
    .from("email_deliveries")
    .update({ status: "retried", updated_at: now.toISOString() })
    .eq("id", id)
    .eq("status", "retrying");
  if (finishError) {
    return { ok: false, error: "The email was processed but its retry status could not be saved.", status: 500 };
  }

  return result.sent
    ? { ok: true }
    : { ok: false, error: `The retry was not accepted: ${result.reason}`, status: 502 };
}

async function buildOrderRetryInput(
  delivery: EmailDeliveryRecord,
  order: OrderRecord,
  getTemplateFn: (key: EmailTemplateKey) => Promise<EmailTemplateSettings>
): Promise<{ ok: true; input: SendEmailInput } | { ok: false; error: string; status: number }> {
  const tracking = {
    messageType: delivery.messageType,
    audience: delivery.audience,
    entityType: delivery.entityType,
    entityId: delivery.entityId,
    retryable: true,
    attemptNumber: delivery.attemptNumber + 1,
    retryOfId: delivery.id,
    ...(!delivery.providerMessageId && delivery.failureReason !== "invalid_idempotent_request"
      ? { idempotencyKey: delivery.idempotencyKey }
      : {})
  } as const;

  if (delivery.messageType === "paid_order_customer") {
    if (!sameRecipient(order.email, delivery.recipient)) {
      return { ok: false, error: "The order customer email no longer matches this delivery.", status: 409 };
    }
    const template = await getTemplateSafely("customer-order-confirmation", getTemplateFn);
    return {
      ok: true,
      input: {
        to: delivery.recipient,
        subject: template.subject,
        replyTo: getCustomerReplyToEmail(),
        html: buildCustomerPaidOrderEmailHtml(order, template),
        delivery: tracking
      }
    };
  }

  if (delivery.messageType === "paid_order_admin") {
    const template = await getTemplateSafely("admin-new-order", getTemplateFn);
    return {
      ok: true,
      input: {
        to: delivery.recipient,
        subject: template.subject,
        html: buildAdminPaidOrderEmailHtml(order, template),
        delivery: tracking
      }
    };
  }

  if (delivery.messageType === "shipping_tracking_customer") {
    if (!sameRecipient(order.email, delivery.recipient)) {
      return { ok: false, error: "The order customer email no longer matches this delivery.", status: 409 };
    }
    const template = await getTemplateSafely("shipping-tracking", getTemplateFn);
    return {
      ok: true,
      input: {
        to: delivery.recipient,
        subject: template.subject,
        replyTo: getCustomerReplyToEmail(),
        html: buildShippingNotificationEmailHtml(order, template),
        delivery: tracking
      }
    };
  }

  return { ok: false, error: "This email type must be resent from its original admin workflow.", status: 409 };
}

async function getTemplateSafely(
  key: EmailTemplateKey,
  getTemplateFn: (key: EmailTemplateKey) => Promise<EmailTemplateSettings>
) {
  try {
    return await getTemplateFn(key);
  } catch {
    return defaultEmailTemplates[key];
  }
}

async function getOrderForRetry(id: string) {
  const result = await getAdminOrderById(id);
  return result.order;
}

async function restoreFailedRetry(client: EmailDeliveryDbClient, id: string, now: Date) {
  try {
    await client
      .from("email_deliveries")
      .update({ status: "failed", updated_at: now.toISOString() })
      .eq("id", id)
      .eq("status", "retrying");
  } catch {
    // The stale retrying state remains visible to an administrator for recovery.
  }
}

function sameRecipient(value: string | null | undefined, expected: string) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized) && normalized === expected.trim().toLowerCase();
}

function getRetryCooldownSeconds(updatedAt: string, now: Date) {
  const updated = new Date(updatedAt);
  if (!Number.isFinite(updated.getTime())) return 0;
  const remainingMs = retryCooldownMs - (now.getTime() - updated.getTime());
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}
