import { describe, expect, it, vi } from "vitest";
import { defaultEmailTemplates } from "@/lib/email-templates";
import { buildMultiLinkOrderEmailTestHtml, sendMultiLinkOrderEmailTest } from "@/lib/order-email-test";

const template = defaultEmailTemplates["customer-order-confirmation"];

describe("Multi-Link order email test", () => {
  it("uses the real hosted order renderer without direct-link placeholders", () => {
    const html = buildMultiLinkOrderEmailTestHtml(template);
    expect(html).toContain("TEST EMAIL ONLY. No purchase was made.");
    expect(html).toContain("Do not fulfill this sample order.");
    expect(html).toContain("Hosted Multi-Link");
    expect(html).toContain("Connection: QR and NFC open your Multi-Link page");
    expect(html).toContain("Manage your Multi-Link page: https://taprater.com/account/stands");
    expect(html).toContain("Logo: Uploaded");
    expect(html).toContain("Artwork confirmed: Yes");
    expect(html).toContain("$73.93");
    expect(html).not.toMatch(/Destination URL:|NFC target:|open the destination link directly|\/p\/your-page/);
  });

  it("uses and escapes the configured template copy", () => {
    const html = buildMultiLinkOrderEmailTestHtml({ ...template, introText: "Custom <intro>", footerText: "QA & support" });
    expect(html).toContain("Custom &lt;intro&gt;");
    expect(html).toContain("QA &amp; support");
  });

  it("sends once only to the selected recipient with test-only tracking", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });
    await expect(sendMultiLinkOrderEmailTest({ template, to: "test@example.com", sendEmailFn })).resolves.toEqual({ sent: true });
    expect(sendEmailFn).toHaveBeenCalledTimes(1);
    expect(sendEmailFn).toHaveBeenCalledWith(expect.objectContaining({
      to: "test@example.com",
      subject: `[Test Multi-Link] ${template.subject}`,
      delivery: expect.objectContaining({ entityId: "customer-order-confirmation:hosted_multilink", retryable: false })
    }));
  });

  it("does not send disabled templates", async () => {
    const sendEmailFn = vi.fn();
    await expect(sendMultiLinkOrderEmailTest({ template: { ...template, enabled: false }, to: "test@example.com", sendEmailFn })).resolves.toEqual({ sent: false, reason: "template_disabled" });
    expect(sendEmailFn).not.toHaveBeenCalled();
  });

  it("rejects another template type", async () => {
    const sendEmailFn = vi.fn();
    await expect(sendMultiLinkOrderEmailTest({ template: defaultEmailTemplates["support-request"], to: "test@example.com", sendEmailFn })).resolves.toEqual({ sent: false, reason: "invalid_test_template" });
    expect(sendEmailFn).not.toHaveBeenCalled();
  });
});
