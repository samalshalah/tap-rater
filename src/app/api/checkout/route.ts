import { handleCheckoutPost } from "@/lib/checkout-route";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

export async function POST(request: Request) {
  const rateLimit = await checkPublicRateLimit(request, "checkout", "PUBLIC_CHECKOUT_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();

  return handleCheckoutPost(request);
}
