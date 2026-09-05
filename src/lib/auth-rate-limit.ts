import { createHmac } from "node:crypto";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export type LoginRateLimitScope = "admin" | "customer" | "customer_recovery";

type AuthRateLimitDbClient = {
  from: (table: string) => any;
};

export type LoginRateLimitContext = {
  configured: boolean;
  identifierHash: string;
  ipHash?: string;
  scope: LoginRateLimitScope;
};

const rateLimitWindowMs = 15 * 60 * 1000;
const maxFailuresPerIdentifier = 5;
const maxFailuresPerIp = 20;

export async function checkLoginRateLimit(input: {
  headers: Headers;
  identifier: string;
  scope: LoginRateLimitScope;
}) {
  const context = createLoginRateLimitContext(input);

  if (!context.configured) {
    return { context, limited: false, retryAfterSeconds: 0 };
  }

  try {
    return checkLoginRateLimitWithClient(getSupabaseAdmin() as AuthRateLimitDbClient, context);
  } catch {
    return { context, limited: false, retryAfterSeconds: 0 };
  }
}

export async function checkLoginRateLimitWithClient(
  client: AuthRateLimitDbClient,
  context: LoginRateLimitContext,
  now = new Date(),
  strict = false
) {
  const since = new Date(now.getTime() - rateLimitWindowMs).toISOString();
  const identifierFailures = await countRecentFailures(client, {
    column: "identifier_hash",
    context,
    since,
    value: context.identifierHash,
    strict
  });
  const ipFailures = context.ipHash
    ? await countRecentFailures(client, {
        column: "ip_hash",
        context,
        since,
        value: context.ipHash,
        strict
      })
    : 0;

  return {
    context,
    limited: identifierFailures >= maxFailuresPerIdentifier || ipFailures >= maxFailuresPerIp,
    retryAfterSeconds: Math.ceil(rateLimitWindowMs / 1000)
  };
}

export async function consumeCustomerRecoveryAttempt(headers: Headers, identifier: string) {
  const context = createLoginRateLimitContext({ headers, identifier, scope: "customer_recovery" });
  if (!context.configured) return { available: false, limited: false, retryAfterSeconds: 0 };

  try {
    const client = getSupabaseAdmin() as AuthRateLimitDbClient;
    const result = await checkLoginRateLimitWithClient(client, context, new Date(), true);
    if (!result.limited) {
      // Count every recovery request, including unknown addresses and successful resets.
      const attempt = await recordLoginAttemptWithClient(client, context, false);
      if (attempt.error) throw new Error("Recovery rate limit unavailable.");
    }
    return { available: true, limited: result.limited, retryAfterSeconds: result.retryAfterSeconds };
  } catch {
    return { available: false, limited: false, retryAfterSeconds: 0 };
  }
}

export async function recordLoginAttempt(context: LoginRateLimitContext, success: boolean) {
  if (!context.configured) return;

  try {
    await recordLoginAttemptWithClient(getSupabaseAdmin() as AuthRateLimitDbClient, context, success);
  } catch {
    // Authentication must remain available if audit logging is temporarily unavailable.
  }
}

export async function recordLoginAttemptWithClient(
  client: AuthRateLimitDbClient,
  context: LoginRateLimitContext,
  success: boolean
) {
  return client.from("auth_login_attempts").insert({
    scope: context.scope,
    identifier_hash: context.identifierHash,
    ip_hash: context.ipHash ?? null,
    success,
    created_at: new Date().toISOString()
  });
}

export function createLoginRateLimitContext(input: {
  headers: Headers;
  identifier: string;
  scope: LoginRateLimitScope;
}): LoginRateLimitContext {
  const ip = getRequestIp(input.headers);
  const secret = getAuthRateLimitSecret();

  return {
    configured: hasSupabaseAdminConfig() && Boolean(secret),
    identifierHash: secret ? hashLoginIdentifier(input.identifier.trim().toLowerCase(), secret) : "",
    ipHash: ip && secret ? hashLoginIdentifier(ip, secret) : undefined,
    scope: input.scope
  };
}

function getRequestIp(headers: Headers) {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cloudflareIp || forwardedFor || headers.get("x-real-ip")?.trim() || undefined;
}

function hashLoginIdentifier(value: string, secret: string) {
  return createHmac("sha256", secret).update(value || "missing").digest("hex");
}

function getAuthRateLimitSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.CUSTOMER_SESSION_SECRET;
}

async function countRecentFailures(
  client: AuthRateLimitDbClient,
  input: {
    column: "identifier_hash" | "ip_hash";
    context: LoginRateLimitContext;
    since: string;
    value: string;
    strict?: boolean;
  }
) {
  const { data, error } = await client
    .from("auth_login_attempts")
    .select("id")
    .eq("scope", input.context.scope)
    .eq(input.column, input.value)
    .eq("success", false)
    .gte("created_at", input.since)
    .limit(maxFailuresPerIp);

  if (error || !Array.isArray(data)) {
    if (input.strict) throw new Error("Recovery rate limit unavailable.");
    return 0;
  }

  return data.length;
}
