import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSessionToken, parseSessionToken } from "@/lib/session-token";

export const adminCookieName = "taprater_admin";
const defaultSessionTtlHours = 7 * 24;

function isLocalAdminOpen() {
  return process.env.NODE_ENV === "development";
}

function getAdminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return secret;
}

function getSessionTtlMs() {
  const configured = Number(process.env.ADMIN_SESSION_TTL_HOURS);
  const ttlHours = Number.isFinite(configured) && configured > 0 ? configured : defaultSessionTtlHours;

  return ttlHours * 60 * 60 * 1000;
}

export function createAdminSessionValue(email: string) {
  if (!process.env.ADMIN_EMAIL || email.trim().toLowerCase() !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
    throw new Error("Admin identity does not match the configured owner.");
  }
  return createSessionToken("admin-session", email, Date.now(), getAdminSecret());
}

export function isValidAdminSession(value: string | undefined) {
  const session = parseSessionToken(value, "admin-session", process.env.ADMIN_SESSION_SECRET, getSessionTtlMs());
  return Boolean(session && process.env.ADMIN_EMAIL && session.email === process.env.ADMIN_EMAIL.trim().toLowerCase());
}

export async function requireAdmin() {
  if (isLocalAdminOpen()) {
    return;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(adminCookieName)?.value;

  if (!isValidAdminSession(session)) {
    redirect("/admin/login");
  }
}

export async function requireAdminApi() {
  if (isLocalAdminOpen()) {
    return null;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(adminCookieName)?.value;

  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  return null;
}
