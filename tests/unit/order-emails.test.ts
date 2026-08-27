import { describe, expect, it, vi } from "vitest";
import {
  buildAdminPaidOrderEmailHtml,
  buildCustomerPaidOrderEmailHtml,
  sendPaidOrderEmails
} from "@/lib/order-emails";
import { buildShippingNotificationEmailHtml } from "@/lib/shipping-emails";
import { buildHostedSetupEmailHtml } from "@/lib/hosted-setup-email";
import type { OrderRecord } from "@/lib/orders";

const paidOrder: OrderRecord = {
  id: "order-123",
  stripe_checkout_session_id: "cs_test_123",
  stripe_payment_intent_id: "pi_test_123",
  status: "paid",
  payment_status: "paid",
  email: "buyer@example.com",
  customer_name: "Buyer Name",
  subtotal_cents: 8800,
  total_cents: 8800,
  currency: "usd",
  shipping_amount_cents: 0,
  shipping_mode: "manual",
  production_status: "not_started",
  shipping_status: "not_shipped",
  shipping_method: null,
  shipping_carrier: null,
  tracking_number: null,
  tracking_url: null,
  shipped_at: null,
  internal_notes: "",
  admin_fulfillment_notes: "",
  line_items_json: [
    {
      productId: "google-review-stand",
      optionId: "standard_direct",
      optionLabel: "Standard Direct Stand",
      title: "Google Review Stand",
      sku: "GRS",
      quantity: 1,
      unitAmountCents: 3900,
      lineSubtotalCents: 3900,
      setup: {
        destinationUrl: "https://g.page/example/review",
        qrTargetUrl: "https://g.page/example/review",
        nfcTargetUrl: "https://g.page/example/review",
        destinationType: "review",
        platformSlug: "google"
      }
    },
    {
      productId: "view-menu-stand",
      optionId: "branded_qr_direct",
      optionLabel: "Branded + QR Direct Stand",
      title: "View Menu Stand",
      sku: "VMS",
      quantity: 1,
      unitAmountCents: 4900,
      lineSubtotalCents: 4900,
      setup: {
        destinationUrl: "https://example.com/menu",
        destinationType: "menu",
        platformSlug: "custom-menu-url",
        businessName: "QA Menu Business",
        logoMediaUrl: "/api/media/product/products/customer-logo.png",
        logoStorageKey: "products/customer-logo.png",
        generatedQrValue: "https://example.com/menu",
        qrTargetUrl: "https://example.com/menu",
        nfcTargetUrl: "https://example.com/menu",
        frontTemplateUrl: "/api/media/product/products/view-menu/front-template.png",
        centerAssetUrl: "/api/media/product/products/view-menu/center/menu.svg",
        ctaText: "View our menu",
        productionArtwork: {
          status: "generated",
          storageKey: "products/view-menu-stand/production_artwork/order-123/line-2-hash.svg",
          url: "/api/media/product/products/view-menu-stand/production_artwork/order-123/line-2-hash.svg",
          format: "svg",
          contentType: "image/svg+xml",
          widthPx: 1278,
          heightPx: 1949,
          dpi: 300,
          widthIn: 4.26,
          heightIn: 6.4967,
          templateId: "taprater-branded-stand-front",
          templateVersion: "2026-08-27.2",
          approvalSnapshotHash: "hash",
          baseTemplateContentHash: "base-template-hash",
          logoContentHash: "logo-hash",
          generatedAt: "2026-08-23T14:00:00.000Z"
        }
      },
      logoReference: "products/customer-logo.png",
      proofApproved: true
    }
  ]
};

describe("paid order emails", () => {
  it("renders customer email with Standard Direct line details", () => {
    const html = buildCustomerPaidOrderEmailHtml(paidOrder);

    expect(html).toContain("Your Tap Rater order is confirmed");
    expect(html).toContain("Google Review Stand - Standard Direct");
    expect(html).toContain("Destination URL: https://g.page/example/review");
    expect(html).toContain("Connection: QR and NFC open the destination link directly");
    expect(html).toContain("QR target: https://g.page/example/review");
    expect(html).toContain("NFC target: https://g.page/example/review");
    expect(html).toContain("Total:</strong> $88.00");
    expect(html).toContain("https://taprater.com/support");
  });

  it("renders customer email with Branded + QR setup details", () => {
    const html = buildCustomerPaidOrderEmailHtml(paidOrder);

    expect(html).toContain("View Menu Stand - Branded + QR Direct");
    expect(html).toContain("Connection: QR and NFC open the destination link directly");
    expect(html).toContain("QR target: https://example.com/menu");
    expect(html).toContain("NFC target: https://example.com/menu");
    expect(html).toContain("Business name: QA Menu Business");
    expect(html).toContain("Logo: Uploaded");
    expect(html).toContain("QR: Generated");
    expect(html).toContain("Proof confirmed: Yes");
    expect(html).toContain("https://taprater.com/shipping");
    expect(html).toContain("https://taprater.com/refund-policy");
    expect(html).toContain("https://taprater.com/terms");
  });

  it("renders admin email with logo, QR, proof, and production readiness", () => {
    const html = buildAdminPaidOrderEmailHtml(paidOrder);

    expect(html).toContain("A paid Tap Rater order is ready for fulfillment review.");
    expect(html).toContain("Stripe session:</strong> cs_test_123");
    expect(html).toContain("Payment intent:</strong> pi_test_123");
    expect(html).toContain("SKU: VMS");
    expect(html).toContain("Logo reference: products/customer-logo.png");
    expect(html).toContain("QR value: https://example.com/menu");
    expect(html).toContain("Front template: /api/media/product/products/view-menu/front-template.png");
    expect(html).toContain("Production artwork status: generated");
    expect(html).toContain("Production template: taprater-branded-stand-front / 2026-08-27.2");
    expect(html).toContain("Production artwork: /api/media/product/products/view-menu-stand/production_artwork/order-123/line-2-hash.svg");
    expect(html).toContain("Production readiness: Ready for production review");
  });

  it("sends customer and admin emails with configured recipients", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await sendPaidOrderEmails(paidOrder, {
      sendEmailFn,
      env: { ORDER_NOTIFICATION_EMAIL: "orders@example.com" }
    });

    expect(result).toEqual({ customer: { sent: true }, admin: { sent: true } });
    expect(sendEmailFn).toHaveBeenCalledTimes(2);
    expect(sendEmailFn.mock.calls[0][0]).toMatchObject({
      to: "buyer@example.com",
      subject: "Your Tap Rater order is confirmed",
      replyTo: "support@taprater.com"
    });
    expect(sendEmailFn.mock.calls[1][0]).toMatchObject({
      to: "orders@example.com",
      subject: "New paid Tap Rater order"
    });
    expect(sendEmailFn.mock.calls[1][0]).not.toHaveProperty("replyTo");
  });

  it("uses configured email template text for paid order emails", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    await sendPaidOrderEmails(paidOrder, {
      sendEmailFn,
      env: { ORDER_NOTIFICATION_EMAIL: "orders@example.com" },
      getTemplateFn: async (key) =>
        key === "customer-order-confirmation"
          ? {
              key,
              label: "Customer",
              description: "",
              enabled: true,
              subject: "Custom customer subject",
              introText: "Custom customer intro",
              supportText: "Custom customer support",
              footerText: "Custom customer footer"
            }
          : {
              key,
              label: "Admin",
              description: "",
              enabled: true,
              subject: "Custom admin subject",
              introText: "Custom admin intro",
              supportText: "",
              footerText: "Custom admin footer"
            }
    });

    expect(sendEmailFn.mock.calls[0][0]).toMatchObject({ subject: "Custom customer subject" });
    expect(sendEmailFn.mock.calls[0][0].html).toContain("Custom customer intro");
    expect(sendEmailFn.mock.calls[0][0].html).toContain("Custom customer support");
    expect(sendEmailFn.mock.calls[0][0].html).toContain("Custom customer footer");
    expect(sendEmailFn.mock.calls[1][0]).toMatchObject({ subject: "Custom admin subject" });
    expect(sendEmailFn.mock.calls[1][0].html).toContain("Custom admin intro");
    expect(sendEmailFn.mock.calls[1][0].html).toContain("Custom admin footer");
  });

  it("falls back to default templates when template loading fails", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    await sendPaidOrderEmails(paidOrder, {
      sendEmailFn,
      env: { ORDER_NOTIFICATION_EMAIL: "orders@example.com" },
      getTemplateFn: async () => {
        throw new Error("template storage unavailable");
      }
    });

    expect(sendEmailFn.mock.calls[0][0]).toMatchObject({ subject: "Your Tap Rater order is confirmed" });
    expect(sendEmailFn.mock.calls[1][0]).toMatchObject({ subject: "New paid Tap Rater order" });
  });

  it("keeps critical paid order emails enabled even when template settings are disabled", async () => {
    const sendEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await sendPaidOrderEmails(paidOrder, {
      sendEmailFn,
      env: { ORDER_NOTIFICATION_EMAIL: "orders@example.com" },
      getTemplateFn: async (key) => ({
        key,
        label: key,
        description: "",
        enabled: false,
        subject: "Disabled",
        introText: "",
        supportText: "",
        footerText: ""
      })
    });

    expect(result).toEqual({
      customer: { sent: true },
      admin: { sent: true }
    });
    expect(sendEmailFn).toHaveBeenCalledTimes(2);
  });

  it("renders hosted page-ready email with account and permanent page URLs", () => {
    const html = buildHostedSetupEmailHtml({
      businessName: "Hosted Cafe",
      hostedPageUrl: "https://taprater.com/p/ABCDEFGHJKM2",
      accountUrl: "https://app.taprater.com/account/login?token=signed-token"
    });

    expect(html).toContain("Your Tap Rater hosted page for Hosted Cafe has been created.");
    expect(html).toContain("https://taprater.com/p/ABCDEFGHJKM2");
    expect(html).toContain("That permanent URL stays the same");
    expect(html).toContain("https://app.taprater.com/account/login?token=signed-token");
    expect(html).toContain("https://taprater.com/support");
    expect(html).not.toMatch(/analytics|clicks|conversion|device|subscription|localhost|workers\\.dev/i);
  });

  it("renders shipping email without leaking internal notes or operational fields", () => {
    const html = buildShippingNotificationEmailHtml({
      ...paidOrder,
      shipping_status: "shipped",
      shipping_carrier: "USPS",
      tracking_number: "TRACK123",
      tracking_url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=TRACK123",
      internal_notes: "Internal packing note",
      admin_fulfillment_notes: "Admin-only note"
    });

    expect(html).toContain("Your Tap Rater order has a shipping update.");
    expect(html).toContain("Status:</strong> Shipped");
    expect(html).toContain("Carrier:</strong> USPS");
    expect(html).toContain("Tracking number:</strong> TRACK123");
    expect(html).toContain("https://tools.usps.com/go/TrackConfirmAction?tLabels=TRACK123");
    expect(html).toContain("https://taprater.com/support");
    expect(html).not.toContain("Internal packing note");
    expect(html).not.toContain("Admin-only note");
    expect(html).not.toMatch(/production_status|shipping_status|line_items_json|service_mode|basic_redirect|hosted_landing_page|localhost|workers\\.dev/i);
  });
});
