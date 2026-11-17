import { describe, expect, it, vi } from "vitest";
import {
  buildEmailTemplatePreviewHtml,
  defaultEmailTemplates,
  getAllEmailTemplatesWithClient,
  getEmailTemplateWithClient,
  mergeEmailTemplatePayload,
  saveEmailTemplate,
  renderEmailTemplateHtml,
  sendEmailTemplateTest
} from "@/lib/email-templates";

describe("email template settings", () => {
  it("returns defaults when persisted settings are missing", async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                };
              }
            };
          }
        };
      }
    };

    await expect(getEmailTemplateWithClient(client, "customer-order-confirmation")).resolves.toEqual(
      defaultEmailTemplates["customer-order-confirmation"]
    );
  });

  it("falls back safely when a DB payload is invalid", () => {
    expect(mergeEmailTemplatePayload("admin-new-order", { subject: "" })).toEqual(defaultEmailTemplates["admin-new-order"]);
  });

  it("preserves intentional empty strings", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from(table: string) {
        expect(table).toBe("site_content");
        return { upsert };
      }
    };

    await saveEmailTemplate(client, {
      key: "support-request",
      enabled: true,
      subject: "Support request",
      introText: "",
      supportText: "",
      footerText: ""
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      key: "email:support-request",
      type: "section",
      status: "published",
      payload: {
        enabled: true,
        subject: "Support request",
        introText: "",
        supportText: "",
        footerText: ""
      }
    }));
  });

  it("escapes raw HTML and script content while rendering preview", () => {
    const html = buildEmailTemplatePreviewHtml({
      ...defaultEmailTemplates["support-request"],
      introText: "<script>alert('x')</script>",
      footerText: "Fish & chips"
    });

    expect(html).toContain("&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;");
    expect(html).toContain("Fish &amp; chips");
    expect(html).not.toContain("<script>");
  });

  it("previews the current $49 QR and NFC stand with coherent synthetic totals", () => {
    const html = buildEmailTemplatePreviewHtml(defaultEmailTemplates["customer-order-confirmation"]);
    expect(html).toContain("Branded + QR Direct");
    expect(html).toContain("Connection: QR and NFC open the destination link directly");
    for (const amount of ["$49.00", "$12.00", "$2.94", "$63.94"]) expect(html).toContain(amount);
    expect(html).not.toContain("Standard Direct");
    expect(html).not.toContain("$39.00");
    expect(html).not.toContain("$53.34");
  });

  it("visibly marks every synthetic preview without marking normal customer rendering", () => {
    for (const template of Object.values(defaultEmailTemplates)) {
      const html = buildEmailTemplatePreviewHtml(template);
      expect(html).toMatch(/<body[^>]*>\s*<p[^>]*><strong>TEST EMAIL ONLY/);
      expect(html).toContain("No purchase was made. Do not fulfill this sample order.");
      expect(html).not.toContain("Standard Direct");
      expect(html).not.toContain("$39.00");
    }
    expect(renderEmailTemplateHtml(defaultEmailTemplates["customer-order-confirmation"], {}))
      .not.toContain("TEST EMAIL ONLY");
  });

  it("sends the visibly labeled current sample through the injected delivery function", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });
    await sendEmailTemplateTest({
      template: defaultEmailTemplates["customer-order-confirmation"],
      to: "admin@example.com",
      sendEmailFn
    });
    expect(sendEmailFn).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringMatching(/^\[Test\]/),
      html: buildEmailTemplatePreviewHtml(defaultEmailTemplates["customer-order-confirmation"]),
      delivery: expect.objectContaining({ messageType: "template_test" })
    }));
  });

  it("loads all templates with defaults merged against persisted rows", async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    key: "email:customer-order-confirmation",
                    payload: {
                      enabled: true,
                      subject: "Custom subject",
                      introText: "",
                      supportText: "",
                      footerText: ""
                    }
                  }
                ],
                error: null
              })
            };
          }
        };
      }
    };

    const templates = await getAllEmailTemplatesWithClient(client);

    expect(templates).toHaveLength(5);
    expect(templates.find((template) => template.key === "customer-order-confirmation")?.subject).toBe("Custom subject");
    expect(templates.find((template) => template.key === "admin-new-order")?.subject).toBe("New paid Tap Rater order");
    expect(templates.find((template) => template.key === "replacement-shipping")?.subject).toBe("Your Tap Rater replacement stand is on its way");
  });

  it("does not send a test email for disabled templates", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });
    const result = await sendEmailTemplateTest({
      template: { ...defaultEmailTemplates["shipping-tracking"], enabled: false },
      to: "admin@example.com",
      sendEmailFn
    });

    expect(result).toEqual({ sent: false, reason: "template_disabled" });
    expect(sendEmailFn).not.toHaveBeenCalled();
  });
});
