import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  applyResendWebhookEvent: vi.fn()
}));

vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: mocks.verify };
  }
}));

vi.mock("@/lib/email-deliveries", () => ({
  applyResendWebhookEvent: mocks.applyResendWebhookEvent
}));

import { POST } from "@/app/api/webhooks/resend/route";

const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "resend-1" } });

describe("Resend webhook route", () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = "whsec_resend_test";
    process.env.RESEND_API_KEY = "re_test";
    mocks.verify.mockReset();
    mocks.verify.mockReturnValue({ type: "email.delivered", data: { email_id: "resend-1" } });
    mocks.applyResendWebhookEvent.mockReset();
    mocks.applyResendWebhookEvent.mockResolvedValue({ ok: true, matched: true });
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("fails closed when the signing secret is missing", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.applyResendWebhookEvent).not.toHaveBeenCalled();
  });

  it("verifies the untouched body and Svix signature headers", async () => {
    const event = { type: "email.delivered", data: { email_id: "resend-1" } };
    mocks.verify.mockReturnValue(event);

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith({
      payload,
      headers: {
        id: "msg_1",
        timestamp: "1725541200",
        signature: "v1,test-signature"
      },
      webhookSecret: "whsec_resend_test"
    });
    expect(mocks.applyResendWebhookEvent).toHaveBeenCalledWith(event);
    await expect(response.json()).resolves.toEqual({ received: true, matched: true });
  });

  it("rejects an invalid signature before touching delivery state", async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    expect(mocks.applyResendWebhookEvent).not.toHaveBeenCalled();
  });

  it("reports persistence failures for verified events", async () => {
    mocks.applyResendWebhookEvent.mockResolvedValue({ ok: false, error: "database unavailable" });

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "database unavailable" });
  });
});

function createRequest() {
  return new Request("https://taprater.com/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_1",
      "svix-timestamp": "1725541200",
      "svix-signature": "v1,test-signature"
    },
    body: payload
  });
}
