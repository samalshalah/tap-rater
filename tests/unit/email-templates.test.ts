import { describe, expect, it, vi } from "vitest";
import {
  buildEmailTemplatePreviewHtml,
  defaultEmailTemplates,
  getAllEmailTemplatesWithClient,
  getEmailTemplateWithClient,
  mergeEmailTemplatePayload,
  saveEmailTemplate,
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

    expect(templates).toHaveLength(4);
    expect(templates.find((template) => template.key === "customer-order-confirmation")?.subject).toBe("Custom subject");
    expect(templates.find((template) => template.key === "admin-new-order")?.subject).toBe("New paid Tap Rater order");
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
