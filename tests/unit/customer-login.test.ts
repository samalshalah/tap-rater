import { afterEach, describe, expect, it } from "vitest";
import { createCustomerActivationUrl } from "@/lib/customer-account";
import { createCustomerLoginUrl, isDevelopmentAdminLoginAllowed } from "@/lib/customer-login";

describe("customer login helpers", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_ACCOUNT_APP_URL;
  });

  it("creates account login verification URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://taprater.com/";

    expect(createCustomerLoginUrl("abc123")).toBe("https://taprater.com/account/login?token=abc123");
  });

  it("creates account activation URLs for password setup", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://taprater.com/";

    expect(createCustomerActivationUrl("activation-token")).toBe("https://taprater.com/account/activate?token=activation-token");
  });

  it("prefers the customer app URL when configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://taprater.com/";
    process.env.NEXT_PUBLIC_ACCOUNT_APP_URL = "https://app.taprater.com/";

    expect(createCustomerLoginUrl("abc123")).toBe("https://app.taprater.com/account/login?token=abc123");
  });

  it("allows missing-email development bypass only for admin email outside production", () => {
    process.env.ADMIN_EMAIL = "admin@taprater.com";

    expect(isDevelopmentAdminLoginAllowed("admin@taprater.com", "development")).toBe(true);
    expect(isDevelopmentAdminLoginAllowed("owner@example.com", "development")).toBe(false);
    expect(isDevelopmentAdminLoginAllowed("admin@taprater.com", "production")).toBe(false);
  });
});
