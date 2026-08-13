import { handleCheckoutPost } from "@/lib/checkout-route";

export async function POST(request: Request) {
  return handleCheckoutPost(request);
}
