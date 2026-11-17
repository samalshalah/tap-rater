import { afterEach, describe, expect, it } from "vitest";
import { createCustomerActivationUrl } from "@/lib/customer-account";

describe("customer activation URLs", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_ACCOUNT_APP_URL;
  });

  it("creates account activation URLs for password setup", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://taprater.com/";

    expect(createCustomerActivationUrl("activation-token")).toBe("https://taprater.com/account/activate?token=activation-token");
  });

  it("prefers the customer app URL when configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://taprater.com/";
    process.env.NEXT_PUBLIC_ACCOUNT_APP_URL = "https://app.taprater.com/";

    expect(createCustomerActivationUrl("abc123")).toBe("https://app.taprater.com/account/activate?token=abc123");
  });
});
