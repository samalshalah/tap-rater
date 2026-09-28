import { createHash } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { rateLimitResponse, type RateLimitBinding } from "@/lib/public-rate-limit";

export type SupportFormAction = "contact" | "setup" | "change-link";
type FormEnvironment = Record<string, string | undefined>;
const productionHosts = new Set(["taprater.com", "www.taprater.com"]);
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function getFormSecurityConfig(env: FormEnvironment = process.env) {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() ?? "";
  const secret = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  // Cloudflare's published dummy keys must never enable a production form.
  const testKey = /^[123]x0{10,}/.test(siteKey) || /^[123]x0{10,}/.test(secret);
  const configured = Boolean(siteKey && secret && (env.NODE_ENV !== "production" || !testKey));
  return { siteKey: configured ? siteKey : null };
}

function unavailable() {
  return Response.json({ error: "Security verification is temporarily unavailable. Please try again shortly." },
    { status: 503, headers: { "Retry-After": "60" } });
}

function rejected() {
  return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
}

export async function checkSupportFormRateLimit(request: Request) {
  return checkLimit(request, "SUPPORT_FORM_RATE_LIMITER");
}

async function checkLimit(request: Request, name: "SUPPORT_FORM_RATE_LIMITER" | "SUPPORT_FORM_DUPLICATE_LIMITER", fingerprint?: string) {
  const host = new URL(request.url).hostname;
  if (process.env.NODE_ENV !== "production" && localHosts.has(host)) return null;
  // Only trust the address set by Cloudflare, not caller-supplied forwarding headers.
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  if (!ip) return unavailable();
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as unknown as Record<string, RateLimitBinding | undefined>)[name];
    if (!binding) return unavailable();
    const key = createHash("sha256").update(fingerprint ?? ip).digest("hex");
    const result = await binding.limit({ key: `support:${key}` });
    return result.success ? null : rateLimitResponse();
  } catch {
    return unavailable();
  }
}

export async function verifySupportForm(request: Request, action: SupportFormAction, payload: unknown) {
  const fields = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (fields.companyWebsite !== undefined && fields.companyWebsite !== "") return rejected();
  const token = fields.turnstileToken;
  if (typeof token !== "string" || !token.trim() || token.length > 2048) return rejected();
  if (!getFormSecurityConfig().siteKey) return unavailable();

  const host = new URL(request.url).hostname;
  const local = process.env.NODE_ENV !== "production" && localHosts.has(host);
  if (!productionHosts.has(host) && !local) return rejected();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return rejected();

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY?.trim(), response: token,
        remoteip: request.headers.get("cf-connecting-ip") || undefined }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return unavailable();
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    // Dummy keys are useful locally; real tokens must match both the page and the form.
    const dummy = local && /^[123]x0{10,}/.test(process.env.TURNSTILE_SITE_KEY ?? "");
    if (result.success !== true || (!dummy && (result.hostname !== host || result.action !== action))) return rejected();
    return null;
  } catch {
    return unavailable();
  }
}

export async function checkSupportFormDuplicate(request: Request, action: SupportFormAction, fields: Record<string, string>) {
  const canonical = Object.keys(fields).sort().map(key => [key, fields[key].trim().replace(/\s+/g, " ").toLowerCase()]);
  return checkLimit(request, "SUPPORT_FORM_DUPLICATE_LIMITER", JSON.stringify([action, canonical]));
}
