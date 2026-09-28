import { getFormSecurityConfig } from "@/lib/support-form-security";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getFormSecurityConfig(), { headers: { "Cache-Control": "no-store" } });
}
