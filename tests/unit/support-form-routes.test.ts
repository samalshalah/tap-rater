import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rate: vi.fn(), verify: vi.fn(), duplicate: vi.fn(),
  contact: vi.fn(), setup: vi.fn(), change: vi.fn(), notify: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/support-form-security", () => ({ checkSupportFormRateLimit: mocks.rate, verifySupportForm: mocks.verify, checkSupportFormDuplicate: mocks.duplicate }));
vi.mock("@/lib/db", () => ({ getSupabaseAdmin: () => ({}), hasSupabaseAdminConfig: () => true }));
vi.mock("@/lib/request-repository", () => ({ saveContactRequest: mocks.contact, saveSetupRequest: mocks.setup, saveChangeLinkRequest: mocks.change }));
vi.mock("@/lib/request-notifications", () => ({ sendRequestNotification: mocks.notify }));
vi.mock("@/lib/admin-media-storage", () => ({ uploadProductMedia: mocks.upload, ProductMediaStorageError: class extends Error {} }));
import { POST as contact } from "@/app/api/forms/contact/route";
import { POST as setup } from "@/app/api/forms/setup/route";
import { POST as change } from "@/app/api/forms/change-link/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rate.mockResolvedValue(null);
  mocks.verify.mockResolvedValue(null);
  mocks.duplicate.mockResolvedValue(null);
  mocks.upload.mockResolvedValue({ url: "https://taprater.com/media/logo.png", filename: "logo.png" });
});
const base = { name: "Customer", email: "customer@example.com", turnstileToken: "token", companyWebsite: "" };
const cases = [
  { action: "contact", handler: contact, fields: { ...base, message: "Please help with my stand." }, save: mocks.contact },
  { action: "setup", handler: setup, fields: { ...base, businessName: "Shop", reviewUrl: "https://example.com/review", notes: "" }, save: mocks.setup },
  { action: "change-link", handler: change, fields: { ...base, tapraterId: "TRATER01-W", newReviewUrl: "https://example.com/review", notes: "" }, save: mocks.change }
];
function req(fields: unknown) { return new Request("https://taprater.com/api/forms/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) }); }

describe.each(cases)("$action support form", ({ action, handler, fields, save }) => {
  it("does not save or notify when verification fails", async () => {
    mocks.verify.mockResolvedValue(Response.json({ error: "Security check failed" }, { status: 400 }));
    expect((await handler(req(fields))).status).toBe(400);
    expect(save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects excessive and duplicate submissions before side effects", async () => {
    mocks.rate.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await handler(req(fields))).status).toBe(429);
    expect(mocks.verify).not.toHaveBeenCalled();
    mocks.duplicate.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await handler(req(fields))).status).toBe(429);
    expect(save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("preserves valid submissions and excludes security fields from storage", async () => {
    expect((await handler(req(fields))).status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith(expect.any(Request), action, fields);
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][1]).not.toHaveProperty("turnstileToken");
    expect(save.mock.calls[0][1]).not.toHaveProperty("companyWebsite");
    expect(mocks.notify).toHaveBeenCalledOnce();
  });
  it("handles malformed payloads without side effects", async () => {
    expect((await handler(req(null))).status).toBe(400);
    expect(save).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});

it("verifies multipart contact submissions before uploading their attachments", async () => {
  const form = new FormData();
  Object.entries(cases[0].fields).forEach(([key, value]) => form.set(key, value));
  form.set("attachment", new File(["png"], "logo.png", { type: "image/png" }));
  mocks.verify.mockResolvedValueOnce(new Response(null, { status: 400 }));
  expect((await contact(new Request("https://taprater.com/api/forms/contact", { method: "POST", body: form }))).status).toBe(400);
  expect(mocks.upload).not.toHaveBeenCalled();
  expect((await contact(new Request("https://taprater.com/api/forms/contact", { method: "POST", body: form }))).status).toBe(200);
  expect(mocks.upload).toHaveBeenCalledOnce();
  expect(mocks.verify.mock.invocationCallOrder[1]).toBeLessThan(mocks.upload.mock.invocationCallOrder[0]);
  expect(mocks.contact.mock.calls[0][1].message).toContain("Attachment: https://taprater.com/media/logo.png");
});
