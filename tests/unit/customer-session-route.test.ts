import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCustomerPortal: vi.fn(),
  isActiveCustomerSession: vi.fn(),
  parseCustomerSession: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "signed-session" }) })
}));

vi.mock("@/lib/customer-auth", () => ({
  customerCookieName: "taprater_customer",
  isActiveCustomerSession: mocks.isActiveCustomerSession,
  parseCustomerSession: mocks.parseCustomerSession
}));

vi.mock("@/lib/customer-portal", () => ({
  getCustomerPortal: mocks.getCustomerPortal
}));

import { GET } from "@/app/api/account/session/route";

describe("customer session route", () => {
  beforeEach(() => {
    mocks.parseCustomerSession.mockReset();
    mocks.parseCustomerSession.mockReturnValue({ email: "owner@example.com" });
    mocks.isActiveCustomerSession.mockReset();
    mocks.isActiveCustomerSession.mockResolvedValue(true);
    mocks.getCustomerPortal.mockReset();
    mocks.getCustomerPortal.mockResolvedValue({ customer: { name: "Owner" }, businesses: [] });
  });

  it("reports a disabled or pending customer session as unauthenticated", async () => {
    mocks.isActiveCustomerSession.mockResolvedValue(false);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ authenticated: false });
    expect(mocks.getCustomerPortal).not.toHaveBeenCalled();
  });

  it("loads account details only for an active customer session", async () => {
    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      email: "owner@example.com",
      name: "Owner"
    });
    expect(mocks.getCustomerPortal).toHaveBeenCalledWith("owner@example.com");
  });
});
