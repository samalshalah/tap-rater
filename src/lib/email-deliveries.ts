import { createHash, randomUUID } from "node:crypto";
import type { WebhookEventPayload } from "resend";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export type EmailDeliveryAudience = "customer" | "admin" | "internal" | "unknown";

export type EmailDeliveryStatus =
  | "sending"
  | "accepted"
  | "delayed"
  | "delivered"
  | "failed"
  | "bounced"
  | "complained"
  | "suppressed"
  | "retrying"
  | "retried";

export type EmailDeliveryTracking = {
  messageType: string;
  audience: EmailDeliveryAudience;
  entityType?: string;
  entityId?: string;
  retryable?: boolean;
  attemptNumber?: number;
  retryOfId?: string;
  idempotencyKey?: string;
};

export type EmailDeliveryRecord = {
  id: string;
  messageType: string;
  audience: EmailDeliveryAudience;
  recipient: string;
  subject: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string;
  idempotencyKey: string;
  failureReason?: string;
  entityType?: string;
  entityId?: string;
  retryable: boolean;
  attemptNumber: number;
  retryOfId?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  lastEventAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminEmailDeliveryOverview = {
  available: boolean;
  deliveries: EmailDeliveryRecord[];
  acceptedCount: number;
  deliveredCount: number;
  problemCount: number;
  pendingCount: number;
};

export type EmailDeliveryDbClient = {
  from: (table: string) => any;
};

type EmailDeliveryIdentity = {
  id: string;
  idempotencyKey: string;
};

const maxStoredTextLength = 500;

export function createEmailDeliveryIdentity(tracking?: EmailDeliveryTracking): EmailDeliveryIdentity {
  const id = randomUUID();
  const configuredKey = tracking?.idempotencyKey?.trim();
  return {
    id,
    idempotencyKey: configuredKey && configuredKey.length <= 256 ? configuredKey : `taprater/${id}`
  };
}

export function createEmailIdempotencyKey(messageType: string, ...sourceParts: Array<string | null | undefined>) {
  const normalizedType = messageType.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 48) || "transactional";
  const source = sourceParts.map((part) => part?.trim() ?? "").join("\u001f");
  const digest = createHash("sha256").update(`${normalizedType}\u001f${source}`).digest("hex");
  return `taprater/${normalizedType}/${digest}`;
}

export async function startEmailDeliveryAttempt(
  input: {
    identity: EmailDeliveryIdentity;
    recipient: string | string[];
    subject: string;
    tracking?: EmailDeliveryTracking;
    now?: Date;
  },
  client?: EmailDeliveryDbClient
) {
  const resolvedClient = resolveClient(client);
  if (!resolvedClient) return false;

  const now = input.now ?? new Date();
  const tracking = input.tracking;
  try {
    const { error } = await resolvedClient.from("email_deliveries").insert({
      id: input.identity.id,
      message_type: truncate(tracking?.messageType || "transactional"),
      audience: tracking?.audience || "unknown",
      recipient: truncate(formatRecipient(input.recipient)),
      subject: truncate(input.subject),
      status: "sending",
      provider_message_id: null,
      idempotency_key: input.identity.idempotencyKey,
      failure_reason: null,
      entity_type: truncateOptional(tracking?.entityType),
      entity_id: truncateOptional(tracking?.entityId),
      retryable: Boolean(tracking?.retryable),
      attempt_number: normalizeAttemptNumber(tracking?.attemptNumber),
      retry_of_id: tracking?.retryOfId || null,
      accepted_at: null,
      delivered_at: null,
      last_event_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });

    return !error;
  } catch {
    return false;
  }
}

export async function finishEmailDeliveryAttempt(
  input: {
    id: string;
    sent: boolean;
    providerMessageId?: string;
    failureReason?: string;
    now?: Date;
  },
  client?: EmailDeliveryDbClient
) {
  const resolvedClient = resolveClient(client);
  if (!resolvedClient) return false;

  const now = input.now ?? new Date();
  try {
    const { error } = await resolvedClient
      .from("email_deliveries")
      .update({
        status: input.sent ? "accepted" : "failed",
        provider_message_id: truncateOptional(input.providerMessageId),
        failure_reason: input.sent ? null : truncateOptional(input.failureReason || "email_send_failed"),
        accepted_at: input.sent ? now.toISOString() : null,
        updated_at: now.toISOString()
      })
      .eq("id", input.id)
      .eq("status", "sending");

    return !error;
  } catch {
    return false;
  }
}

export async function getAdminEmailDeliveries(): Promise<AdminEmailDeliveryOverview> {
  if (!hasSupabaseAdminConfig()) return emptyOverview(false);
  return getAdminEmailDeliveriesWithClient(getSupabaseAdmin() as EmailDeliveryDbClient);
}

export async function getAdminEmailDeliveriesWithClient(
  client: EmailDeliveryDbClient
): Promise<AdminEmailDeliveryOverview> {
  try {
    const { data, error } = await client
      .from("email_deliveries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (error || !Array.isArray(data)) return emptyOverview(false);
    const deliveries = data.map(normalizeEmailDelivery).filter((row): row is EmailDeliveryRecord => Boolean(row));
    return buildOverview(deliveries);
  } catch {
    return emptyOverview(false);
  }
}

export async function getEmailDeliveryByIdWithClient(client: EmailDeliveryDbClient, id: string) {
  try {
    const { data, error } = await client.from("email_deliveries").select("*").eq("id", id).maybeSingle();
    return error ? null : normalizeEmailDelivery(data);
  } catch {
    return null;
  }
}

export async function applyResendWebhookEvent(event: WebhookEventPayload) {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false as const, error: "Email delivery storage is not configured." };
  }

  return applyResendWebhookEventWithClient(getSupabaseAdmin() as EmailDeliveryDbClient, event);
}

export async function applyResendWebhookEventWithClient(
  client: EmailDeliveryDbClient,
  event: WebhookEventPayload
) {
  const providerMessageId = readProviderMessageId(event);
  if (!providerMessageId) return { ok: true as const, matched: false };

  const { data, error } = await client
    .from("email_deliveries")
    .select("*")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (error) return { ok: false as const, error: "Email delivery event could not be loaded." };

  const current = normalizeEmailDelivery(data);
  if (!current) return { ok: true as const, matched: false };

  const eventAt = normalizeEventDate(event.created_at);
  if (current.lastEventAt && new Date(current.lastEventAt).getTime() > new Date(eventAt).getTime()) {
    return { ok: true as const, matched: true, ignored: true };
  }

  const nextStatus = mapResendEventStatus(event.type, current.status);
  const update: Record<string, unknown> = {
    last_event_at: eventAt,
    updated_at: eventAt
  };
  if (nextStatus) update.status = nextStatus;
  if (nextStatus === "delivered") {
    update.delivered_at = eventAt;
    update.failure_reason = null;
  } else {
    const failureReason = readEventFailureReason(event);
    if (failureReason) update.failure_reason = truncate(failureReason);
  }

  const { error: updateError } = await client.from("email_deliveries").update(update).eq("id", current.id);
  return updateError
    ? { ok: false as const, error: "Email delivery event could not be saved." }
    : { ok: true as const, matched: true, ignored: false };
}

export function isRetryableEmailStatus(status: EmailDeliveryStatus) {
  return status === "failed";
}

function buildOverview(deliveries: EmailDeliveryRecord[]): AdminEmailDeliveryOverview {
  return {
    available: true,
    deliveries,
    acceptedCount: deliveries.filter((delivery) => delivery.status === "accepted").length,
    deliveredCount: deliveries.filter((delivery) => delivery.status === "delivered").length,
    problemCount: deliveries.filter((delivery) =>
      ["failed", "bounced", "complained", "suppressed"].includes(delivery.status)
    ).length,
    pendingCount: deliveries.filter((delivery) =>
      ["sending", "delayed", "retrying"].includes(delivery.status)
    ).length
  };
}

function emptyOverview(available: boolean): AdminEmailDeliveryOverview {
  return {
    available,
    deliveries: [],
    acceptedCount: 0,
    deliveredCount: 0,
    problemCount: 0,
    pendingCount: 0
  };
}

function normalizeEmailDelivery(value: unknown): EmailDeliveryRecord | null {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = readString(row.id);
  const createdAt = readString(row.created_at);
  const updatedAt = readString(row.updated_at) ?? createdAt;
  const idempotencyKey = readString(row.idempotency_key);
  if (!id || !createdAt || !updatedAt || !idempotencyKey) return null;

  return {
    id,
    messageType: readString(row.message_type) ?? "transactional",
    audience: readAudience(row.audience),
    recipient: readString(row.recipient) ?? "",
    subject: readString(row.subject) ?? "",
    status: readStatus(row.status),
    providerMessageId: readString(row.provider_message_id),
    idempotencyKey,
    failureReason: readString(row.failure_reason),
    entityType: readString(row.entity_type),
    entityId: readString(row.entity_id),
    retryable: row.retryable === true,
    attemptNumber: normalizeAttemptNumber(row.attempt_number),
    retryOfId: readString(row.retry_of_id),
    acceptedAt: readString(row.accepted_at),
    deliveredAt: readString(row.delivered_at),
    lastEventAt: readString(row.last_event_at),
    createdAt,
    updatedAt
  };
}

function mapResendEventStatus(type: WebhookEventPayload["type"], currentStatus: EmailDeliveryStatus) {
  if (type === "email.sent") {
    return currentStatus === "sending" ? "accepted" : currentStatus;
  }
  if (type === "email.delivery_delayed") {
    return ["sending", "accepted", "delayed"].includes(currentStatus) ? "delayed" : currentStatus;
  }
  if (type === "email.delivered") return currentStatus === "complained" ? currentStatus : "delivered";
  if (type === "email.failed") return currentStatus === "delivered" ? currentStatus : "failed";
  if (type === "email.bounced") return currentStatus === "delivered" ? currentStatus : "bounced";
  if (type === "email.complained") return "complained";
  if (type === "email.suppressed") return currentStatus === "delivered" ? currentStatus : "suppressed";
  return null;
}

function readProviderMessageId(event: WebhookEventPayload) {
  const data = event.data as unknown as Record<string, unknown>;
  return readString(data.email_id);
}

function readEventFailureReason(event: WebhookEventPayload) {
  const data = event.data as unknown as Record<string, unknown>;
  if (event.type === "email.failed") return readNestedString(data.failed, "reason");
  if (event.type === "email.bounced") return readNestedString(data.bounce, "message");
  if (event.type === "email.suppressed") return readNestedString(data.suppressed, "message");
  if (event.type === "email.complained") return "Recipient reported this message as spam.";
  if (event.type === "email.delivery_delayed") return "Delivery was delayed by the recipient server.";
  return undefined;
}

function readNestedString(value: unknown, key: string) {
  return value && typeof value === "object" ? readString((value as Record<string, unknown>)[key]) : undefined;
}

function resolveClient(client?: EmailDeliveryDbClient) {
  if (client) return client;
  return hasSupabaseAdminConfig() ? (getSupabaseAdmin() as EmailDeliveryDbClient) : null;
}

function formatRecipient(value: string | string[]) {
  return Array.isArray(value) ? value.join(", ") : value;
}

function normalizeAttemptNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5 ? value : 1;
}

function normalizeEventDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function truncateOptional(value: unknown) {
  const text = readString(value);
  return text ? truncate(text) : null;
}

function truncate(value: string) {
  return value.slice(0, maxStoredTextLength);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readAudience(value: unknown): EmailDeliveryAudience {
  return value === "customer" || value === "admin" || value === "internal" ? value : "unknown";
}

function readStatus(value: unknown): EmailDeliveryStatus {
  return value === "sending" ||
    value === "accepted" ||
    value === "delayed" ||
    value === "delivered" ||
    value === "failed" ||
    value === "bounced" ||
    value === "complained" ||
    value === "suppressed" ||
    value === "retrying" ||
    value === "retried"
    ? value
    : "failed";
}
