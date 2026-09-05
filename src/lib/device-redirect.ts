import { createHmac } from "node:crypto";

export type DeviceStatus = "unactivated" | "active" | "paused" | "lost" | "retired";
export type DeviceServiceMode = "basic_redirect" | "managed_redirect" | "premium_landing_page";

export type PlatformDevice = {
  id: string;
  deviceCode: string;
  productType: string;
  serviceMode: DeviceServiceMode;
  status: DeviceStatus;
  customerId?: string;
  businessId?: string;
  destinationType?: string;
  destinationUrl?: string;
  landingPageId?: string;
  label?: string;
};

export type DeviceRedirectAction =
  | { type: "activation"; deviceCode: string }
  | { type: "redirect"; destinationUrl: string }
  | { type: "landing_page"; landingPageId?: string }
  | { type: "unavailable"; reason: "invalid_destination" | "missing_destination" | "paused" | "lost" | "retired" }
  | { type: "not_found" };

export function isSafeRedirectUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function hashIpAddress(value: string | undefined, secret = getIpHashSecret()) {
  if (!value || !secret) {
    return undefined;
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function getIpHashSecret() {
  return process.env.IP_HASH_SECRET || process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
}

export function getDeviceRedirectAction(device: PlatformDevice | null): DeviceRedirectAction {
  if (!device) {
    return { type: "not_found" };
  }

  if (device.status === "unactivated") {
    return { type: "activation", deviceCode: device.deviceCode };
  }

  if (device.status === "paused" || device.status === "lost" || device.status === "retired") {
    return { type: "unavailable", reason: device.status };
  }

  if (device.serviceMode === "premium_landing_page") {
    return { type: "landing_page", landingPageId: device.landingPageId };
  }

  if (!device.destinationUrl) {
    return { type: "unavailable", reason: "missing_destination" };
  }

  if (!isSafeRedirectUrl(device.destinationUrl)) {
    return { type: "unavailable", reason: "invalid_destination" };
  }

  return { type: "redirect", destinationUrl: device.destinationUrl };
}
