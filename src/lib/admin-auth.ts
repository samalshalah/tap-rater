import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const adminCookieName = "taprater_admin";
const defaultSessionTtlHours = 7 * 24;
const futureClockSkewMs = 5 * 60 * 1000;

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

function sign(value: string) {
  return createHmac("sha256", getAdminSecret()).update(value).digest("hex");
}

function getSessionTtlMs() {
  const configured = Number(process.env.ADMIN_SESSION_TTL_HOURS);
  const ttlHours = Number.isFinite(configured) && configured > 0 ? configured : defaultSessionTtlHours;

  return ttlHours * 60 * 60 * 1000;
}

function getPayloadTimestamp(payload: string) {
  if (!payload) {
    return null;
  }

  const separatorIndex = payload.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex === payload.length - 1) {
    return null;
  }

  const timestampValue = payload.slice(separatorIndex + 1);
  if (!/^\d+$/.test(timestampValue)) {
    return null;
  }

  const timestamp = Number(timestampValue);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

export function createAdminSessionValue(email: string) {
  const payload = `${email}:${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(value: string | undefined) {
  if (!value) {
    return false;
  }

  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) {
    return false;
  }

  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const timestamp = getPayloadTimestamp(payload);

  if (timestamp === null) {
    return false;
  }

  const expected = sign(payload);

  if (signature.length !== expected.length) {
    return false;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }

  const now = Date.now();
  if (timestamp > now + futureClockSkewMs) {
    return false;
  }

  return now - timestamp <= getSessionTtlMs();
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
