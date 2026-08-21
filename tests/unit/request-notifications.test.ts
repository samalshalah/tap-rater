import { afterEach, describe, expect, it, vi } from "vitest";
import { sendRequestNotification } from "@/lib/request-notifications";

describe("request notifications", () => {
  afterEach(() => {
    delete process.env.ORDER_NOTIFICATION_EMAIL;
    vi.restoreAllMocks();
  });

  it("uses configured request notification copy", async () => {
    process.env.ORDER_NOTIFICATION_EMAIL = "orders@example.com";
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await sendRequestNotification(
      {
        subject: "Fallback subject",
        rows: {
          Name: "QA Customer",
          Message: "Please help"
        }
      },
      {
        sendEmailFn,
        getTemplateFn: async () => ({
          key: "support-request",
          label: "Support request",
          description: "",
          enabled: true,
          subject: "Configured request subject",
          introText: "Configured request intro",
          supportText: "Configured support text",
          footerText: "Configured footer"
        })
      }
    );

    expect(result).toEqual({ sent: true });
    expect(sendEmailFn).toHaveBeenCalledWith(expect.objectContaining({
      to: "orders@example.com",
      subject: "Configured request subject",
      html: expect.stringContaining("Configured request intro")
    }));
    expect(sendEmailFn.mock.calls[0][0].html).toContain("Configured support text");
    expect(sendEmailFn.mock.calls[0][0].html).toContain("Configured footer");
  });

  it("does not throw when request notification sending fails", async () => {
    process.env.ORDER_NOTIFICATION_EMAIL = "orders@example.com";

    const result = await sendRequestNotification(
      {
        subject: "Fallback subject",
        rows: {
          Name: "QA Customer"
        }
      },
      {
        sendEmailFn: vi.fn().mockRejectedValue(new Error("Resend unavailable"))
      }
    );

    expect(result).toEqual({ sent: false, reason: "email_send_exception" });
  });
});
