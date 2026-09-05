import { describe, expect, it } from "vitest";
import { getDeviceRedirectAction, hashIpAddress, isSafeRedirectUrl, type PlatformDevice } from "@/lib/device-redirect";

const activeDevice: PlatformDevice = {
  id: "device-1",
  deviceCode: "TR-ACTIVE",
  productType: "google_review",
  serviceMode: "basic_redirect",
  status: "active",
  destinationType: "google_review",
  destinationUrl: "https://example.com/review"
};

describe("device redirect", () => {
  it("accepts only http and https redirect URLs", () => {
    expect(isSafeRedirectUrl("https://example.com/review")).toBe(true);
    expect(isSafeRedirectUrl("http://example.com/review")).toBe(true);
    expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirectUrl("data:text/html,test")).toBe(false);
    expect(isSafeRedirectUrl("not-a-url")).toBe(false);
  });

  it("hashes IP values instead of returning raw IPs", () => {
    const hash = hashIpAddress("203.0.113.10", "unit-test-secret");

    expect(hash).not.toBe("203.0.113.10");
    expect(hash).toHaveLength(64);
    expect(hashIpAddress("203.0.113.10", "unit-test-secret")).toBe(hash);
    expect(hashIpAddress("203.0.113.10", "")).toBeUndefined();
  });

  it("sends unactivated devices to activation", () => {
    expect(getDeviceRedirectAction({ ...activeDevice, status: "unactivated" })).toEqual({
      type: "activation",
      deviceCode: "TR-ACTIVE"
    });
  });

  it("redirects active basic redirect devices to safe destination URLs", () => {
    expect(getDeviceRedirectAction(activeDevice)).toEqual({
      type: "redirect",
      destinationUrl: "https://example.com/review"
    });
  });

  it("rejects active devices with unsafe destination URLs", () => {
    expect(getDeviceRedirectAction({ ...activeDevice, destinationUrl: "javascript:alert(1)" })).toEqual({
      type: "unavailable",
      reason: "invalid_destination"
    });
  });

  it("renders landing page placeholder for premium landing page devices", () => {
    expect(
      getDeviceRedirectAction({
        ...activeDevice,
        serviceMode: "premium_landing_page",
        landingPageId: "landing-1"
      })
    ).toEqual({
      type: "landing_page",
      landingPageId: "landing-1"
    });
  });

  it("marks paused devices unavailable", () => {
    expect(getDeviceRedirectAction({ ...activeDevice, status: "paused" })).toEqual({
      type: "unavailable",
      reason: "paused"
    });
  });
});
