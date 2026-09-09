import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin email template API", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/admin-auth");
    vi.doUnmock("@/lib/email-templates");
    vi.doUnmock("@/lib/order-email-test");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  async function authorizedRoute() {
    const hostedSend = vi.fn().mockResolvedValue({ sent: true });
    const normalSend = vi.fn().mockResolvedValue({ sent: true });
    const loadTemplate = vi.fn().mockResolvedValue({ key: "customer-order-confirmation", enabled: true });
    vi.doMock("@/lib/admin-auth", () => ({ requireAdminApi: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/order-email-test", () => ({ sendMultiLinkOrderEmailTest: hostedSend }));
    vi.doMock("@/lib/email-templates", async importOriginal => ({
      ...await importOriginal<typeof import("@/lib/email-templates")>(),
      getEmailTemplate: loadTemplate,
      sendEmailTemplateTest: normalSend
    }));
    const { POST } = await import("@/app/api/admin/email-templates/test/route");
    const post = (body: unknown) => POST(new Request("https://taprater.test/api/admin/email-templates/test", {
      method: "POST", body: JSON.stringify(body)
    }));
    return { post, hostedSend, normalSend, loadTemplate };
  }

  it("routes the explicit hosted scenario through the actual order test renderer", async () => {
    const { post, hostedSend, normalSend } = await authorizedRoute();
    const response = await post({ key: "customer-order-confirmation", scenario: "hosted_multilink", to: "test@example.com" });
    expect(response.status).toBe(200);
    expect(hostedSend).toHaveBeenCalledWith({ template: { key: "customer-order-confirmation", enabled: true }, to: "test@example.com" });
    expect(normalSend).not.toHaveBeenCalled();
  });

  it("preserves the existing generic test route when no scenario is requested", async () => {
    const { post, hostedSend, normalSend } = await authorizedRoute();
    expect((await post({ key: "customer-order-confirmation", to: "test@example.com" })).status).toBe(200);
    expect(normalSend).toHaveBeenCalledTimes(1);
    expect(hostedSend).not.toHaveBeenCalled();
  });

  it.each([
    { key: "admin-new-order", scenario: "hosted_multilink", to: "test@example.com" },
    { key: "customer-order-confirmation", scenario: "unknown", to: "test@example.com" },
    { key: "customer-order-confirmation", scenario: "hosted_multilink", to: "not-an-email" }
  ])("rejects invalid hosted test input %j before sending", async body => {
    const { post, hostedSend, normalSend, loadTemplate } = await authorizedRoute();
    expect((await post(body)).status).toBe(400);
    expect(hostedSend).not.toHaveBeenCalled();
    expect(normalSend).not.toHaveBeenCalled();
    expect(loadTemplate).not.toHaveBeenCalled();
  });

  it("does not report success when the test delivery fails", async () => {
    const { post, hostedSend } = await authorizedRoute();
    hostedSend.mockResolvedValue({ sent: false, reason: "template_disabled" });
    expect((await post({ key: "customer-order-confirmation", scenario: "hosted_multilink", to: "test@example.com" })).status).toBe(502);
  });

  it("requires admin auth for test-send", async () => {
    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }))
    }));

    const { POST } = await import("@/app/api/admin/email-templates/test/route");
    const response = await POST(
      new Request("https://taprater.test/api/admin/email-templates/test", {
        method: "POST",
        body: JSON.stringify({ key: "customer-order-confirmation" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Admin authentication required." });
  });
});
