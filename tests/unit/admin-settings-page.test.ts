import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminSettingsPage from "@/app/admin/settings/page";
import { requireAdmin } from "@/lib/admin-auth";
import { launchOwnerRecord } from "@/data/launch-owner-record";

vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/components/admin/admin-shell", () => ({ AdminShell: ({ children }: { children: ReactNode }) => children }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue(undefined);
  for (const [key, value] of Object.entries({
    ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "private-admin-password", ADMIN_SESSION_SECRET: "private-admin-session",
    CUSTOMER_SESSION_SECRET: "private-customer-session", DATABASE_URL: "postgres://private-db",
    GOOGLE_PLACES_API_KEY: "private-places-key", STRIPE_MODE: "test", STRIPE_SECRET_KEY: "sk_test_private",
    STRIPE_PUBLISHABLE_KEY: "pk_test_private", STRIPE_WEBHOOK_SECRET: "whsec_private",
    STRIPE_BILLING_PORTAL_CONFIGURED: "true", STRIPE_CUSTOMER_EMAILS_CONFIGURED: "true",
    RESEND_API_KEY: "re_private", RESEND_FROM_EMAIL: "notifications@example.test", RESEND_WEBHOOK_SECRET: "whsec_private_resend",
    TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES: "true"
  })) vi.stubEnv(key, value);
});

afterEach(() => vi.unstubAllEnvs());

describe("admin configuration and launch status", () => {
  it("separates full configuration coverage from the held live release", async () => {
    const html = renderToStaticMarkup(await AdminSettingsPage());
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(html).toContain("Configuration coverage");
    expect(html).toContain("100%");
    expect(html).toContain("not overall project completion or live-launch approval");
    expect(html).toContain(">TEST<");
    expect(html).toContain(">On hold<");
    expect(html).toContain("separately authorizing live Stripe activation");
    expect(html).not.toContain("Environment readiness");
    expect(html).not.toContain("Manual confirmations");
  });

  it("records accepted owner confirmations once with date, provenance and limited scope", async () => {
    const html = renderToStaticMarkup(await AdminSettingsPage());
    expect(html).toMatch(/datetime="2026-09-08"/i);
    expect(html).toContain("Owner-reported on");
    expect(html.match(/>Owner confirmed</g)).toHaveLength(2);
    expect(html).toContain("email issue resolved");
    expect(html).toContain("manual 6% tax on Virginia physical stand subtotals only");
    expect(html).toContain("excluding shipping and recurring service");
    expect(html).toContain("not independent legal approval or approval of later changes");
    expect(html).toContain("Excluded from the configuration score");
    expect(html).not.toContain("still require accountant approval");
    expect(launchOwnerRecord.confirmations).toHaveLength(2);
  });

  it("does not expose credentials or add payment/configuration mutation controls", async () => {
    const html = renderToStaticMarkup(await AdminSettingsPage());
    expect(html).not.toContain("private");
    expect(html).not.toContain("<form");
    for (const href of ["/admin/settings/emails", "/admin/shipping", "/admin/taxes", "/admin/products", "/admin/content"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("retains owner history if current configuration becomes invalid", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_mismatch");
    vi.stubEnv("RESEND_API_KEY", "");
    const html = renderToStaticMarkup(await AdminSettingsPage());
    expect(html).toContain("Configuration error");
    expect(html).toContain("email issue resolved");
    expect(html).toContain("RESEND_API_KEY or RESEND_FROM_EMAIL is missing");
    expect(html).not.toContain("100%");
  });

  it("does not turn LIVE configuration into owner approval", async () => {
    vi.stubEnv("STRIPE_MODE", "live");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_private");
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_live_private");
    const html = renderToStaticMarkup(await AdminSettingsPage());
    expect(html).toContain(">LIVE<");
    expect(html).toContain(">On hold<");
    expect(html).toContain("does not establish owner authorization");
  });

  it("requires admin authentication before returning settings", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("REDIRECT:admin/login"));
    await expect(AdminSettingsPage()).rejects.toThrow("REDIRECT:admin/login");
  });
});
