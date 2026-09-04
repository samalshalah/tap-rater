import { createHmac } from "node:crypto";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

export type LoginRateLimitScope = "admin" | "customer";

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
  now = new Date()
) {
  const since = new Date(now.getTime() - rateLimitWindowMs).toISOString();
  const identifierFailures = await countRecentFailures(client, {
    column: "identifier_hash",
    context,
    since,
    value: context.identifierHash
  });
  const ipFailures = context.ipHash
    ? await countRecentFailures(client, {
        column: "ip_hash",
        context,
        since,
        value: context.ipHash
      })
    : 0;

  return {
    context,
    limited: identifierFailures >= maxFailuresPerIdentifier || ipFailures >= maxFailuresPerIp,
    retryAfterSeconds: Math.ceil(rateLimitWindowMs / 1000)
  };
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

  return {
    configured: hasSupabaseAdminConfig(),
    identifierHash: hashLoginIdentifier(input.identifier.trim().toLowerCase()),
    ipHash: ip ? hashLoginIdentifier(ip) : undefined,
    scope: input.scope
  };
}

function getRequestIp(headers: Headers) {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cloudflareIp || forwardedFor || headers.get("x-real-ip")?.trim() || undefined;
}

function hashLoginIdentifier(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.CUSTOMER_SESSION_SECRET || "tap-rater-auth-rate-limit";
  return createHmac("sha256", secret).update(value || "missing").digest("hex");
}

async function countRecentFailures(
  client: AuthRateLimitDbClient,
  input: {
    column: "identifier_hash" | "ip_hash";
    context: LoginRateLimitContext;
    since: string;
    value: string;
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
    return 0;
  }

  return data.length;
}
