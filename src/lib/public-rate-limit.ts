import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashIpAddress } from "@/lib/device-redirect";

export type RateLimitBinding = {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
};

type RateLimitBindingName = "PUBLIC_EVENT_RATE_LIMITER" | "PUBLIC_FORM_RATE_LIMITER" | "PUBLIC_CHECKOUT_RATE_LIMITER";

export type PublicRateLimitScope =
  | "checkout"
  | "change-link"
  | "contact"
  | "hosted-click"
  | "hosted-submit"
  | "manual-checkout"
  | "setup"
  | "setup-logo";

export async function checkPublicRateLimit(
  request: Request,
  scope: PublicRateLimitScope,
  bindingName: RateLimitBindingName
) {
  const ip = getTrustedRequestIp(request.headers);
  if (!ip) return { limited: false };

  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as CloudflareEnv & Partial<Record<RateLimitBindingName, RateLimitBinding>>;
    const binding = env[bindingName];
    if (!binding) return { limited: false };

    return checkPublicRateLimitWithBinding(request, scope, binding);
  } catch {
    return { limited: false };
  }
}

export async function checkPublicRateLimitWithBinding(
  request: Request,
  scope: PublicRateLimitScope,
  binding: RateLimitBinding
) {
  const ip = getTrustedRequestIp(request.headers);
  if (!ip) return { limited: false };

  try {
    const key = `${scope}:${hashIpAddress(ip) ?? ip}`;
    const result = await binding.limit({ key });
    return { limited: !result.success };
  } catch {
    return { limited: false };
  }
}

export function getTrustedRequestIp(headers: Headers) {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  const forwardedIp = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();

  return cloudflareIp || forwardedIp || realIp || undefined;
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Too many requests. Please wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
