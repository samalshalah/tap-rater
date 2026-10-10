import { timingSafeEqual } from "node:crypto";
import { runCheckoutReminders } from "@/lib/checkout-reminders";
export async function POST(request: Request) {
  const expected = process.env.ADMIN_SESSION_SECRET, actual = request.headers.get("x-internal-secret");
  if (!expected || !actual || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return new Response(null, { status: 401 });
  return Response.json(await runCheckoutReminders());
}
