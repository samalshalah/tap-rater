import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { googleConfig } from "./connection";

// Unlike the general admin UI, OAuth never uses the development authentication bypass.
export async function googleAdminIdentity() {
  const session = (await cookies()).get(adminCookieName)?.value;
  if (!session || !isValidAdminSession(session) || !process.env.ADMIN_EMAIL) return null;
  return { owner: process.env.ADMIN_EMAIL.trim().toLowerCase(), session };
}
export function googleSameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(googleConfig().redirectUri).origin;
}
