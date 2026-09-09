# Content Phase 1: Owner Test

This release keeps Stripe in TEST mode. It does not authorize live payments or certify printer-specific color and bleed settings.

## Branded Direct

1. Open https://taprater.com/product/google-review-stand after deployment is verified. Refresh the page and start a new setup; older Branded cart items need a new approval.
2. Select Branded + QR and Set Up My Stand. Paste the destination link and confirm the first-step QR uses it.
3. Add the business name and upload a PNG/JPG/WEBP logo, preferably at least 1200px wide. Continue to Preview.
4. Check the artwork, move the Logo size and Business name size sliders, and use the reset icon to center the logo again. Scan the QR with a phone. Every design change requires a fresh approval.
5. Approve the displayed artwork and continue through shipping to payment. Use only Stripe test details: 4242 4242 4242 4242, a future expiration date, and any three-digit CVC. Never use a real card for this test. Stripe reference: https://docs.stripe.com/testing
6. After success, open Admin > Orders > the new order. Verify Paid, then download Production artwork and compare logo, text, placement and QR with the approved preview.

Expected: no final production file for an unpaid order; one matching final SVG after verified payment. Repeated payment events must not change the approved destination or duplicate provisioning.

## Standard and Multi-Link

- Standard remains NFC-only, with no printed QR or custom artwork approval.
- Branded + Multi-Link reserves its permanent Tap Rater page destination before preview. After the test payment, verify that the same QR opens the provisioned page and that the order includes the separate recurring service price.
- Direct supports multiple identical stands. Multi-Link remains one stand/page per configured item.

## Release Scope

Includes the previously accepted runtime files matched to the September 9 release manifest, plus Phase 1 content and approved-artwork changes. Local secrets, browser data, build output and private test artifacts are excluded from the new commit.

Printer acceptance of SVG, final dimensions, bleed and color settings remains open. Current template: 4.26 x 6.4967 inches, 1278 x 1949 at 300 DPI, with outlined business-name text. Browser/payment acceptance is separate from automated regression tests.
