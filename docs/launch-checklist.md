# Tap Rater Launch Checklist

> Current completion evidence and owner-required follow-ups are tracked in `docs/project-completion-status.md`. This file is the detailed baseline checklist; unchecked boxes here do not necessarily mean the item is still unverified.

Use this checklist before selling or shipping Tap Rater devices that point to `https://taprater.com/r/{deviceCode}`. It covers QA, security, packaging, and operational checks for the current platform stage.

Stripe checkout is available for test mode only. Live payments, live paid orders, tax, and shipping calculation are intentionally not live yet.

## Environment Variables

- [ ] `ADMIN_EMAIL` is set in production.
- [ ] `ADMIN_PASSWORD` is set and stored only in the deployment secret manager.
- [ ] `ADMIN_SESSION_SECRET` is a long random value.
- [ ] `ADMIN_SESSION_TTL_HOURS` is set if the default 7-day admin session is not desired.
- [ ] `CUSTOMER_SESSION_SECRET` is set and is different from the admin password.
- [ ] `DATABASE_URL` or `NEON_DATABASE_URL` points to the production Neon/Postgres database, or Supabase server credentials are set.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, when used, is set server-side only.
- [ ] `RESEND_API_KEY` is set for customer/account emails and request notifications.
- [ ] `RESEND_FROM_EMAIL` uses a sender identity verified by Resend.
- [ ] `RESEND_WEBHOOK_SECRET` is set from the Resend webhook signing secret.
- [ ] `ORDER_NOTIFICATION_EMAIL` is set to the internal Tap Rater notification inbox.
- [ ] `NEXT_PUBLIC_SITE_URL` is set to `https://taprater.com`.
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set only after Google restrictions are configured.
- [ ] `STRIPE_SECRET_KEY` is set only with a `sk_test_` value.
- [ ] `STRIPE_WEBHOOK_SECRET` is set from the Stripe CLI or Stripe test webhook endpoint.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set only with a `pk_test_` value.
- [ ] No production secret values are committed to the repository, screenshots, issue comments, or docs.

## Database Schema

- [ ] Run `supabase/schema.sql` in the production Neon or Supabase SQL editor before testing activation, redirects, hosted landing pages, analytics, or Stripe test orders.
- [ ] Run `npm run check:platform-schema` locally to confirm the deployable schema includes the required platform tables.
- [ ] Run `supabase/demo-seed.sql` only in local development or a non-production database project.
- [ ] Confirm these platform tables exist:
  - [ ] `customers`
  - [ ] `businesses`
  - [ ] `devices`
  - [ ] `landing_pages`
  - [ ] `tap_events`
  - [ ] `form_submissions`
  - [ ] `device_activation_attempts`
- [ ] Confirm these storefront/admin tables exist:
  - [ ] `site_content`
  - [ ] `products`
  - [ ] `orders`
  - [ ] `media_assets`
  - [ ] `contact_requests`
  - [ ] `setup_requests`
  - [ ] `change_link_requests`
  - [ ] `email_deliveries`
- [ ] Confirm product metadata columns exist: `product_type`, `service_mode`, `checkout_mode`, `requires_account`, `requires_subscription`, `requires_landing_page`, `supported_destinations`, `activation_type`, `included_service_label`, `customization_options`, `allows_logo_upload`, `allows_custom_design`, `design_mode`.
- [ ] Confirm `buy_now` products can use Stripe test checkout and quote/subscription/contact-sales products do not enter one-time checkout.
- [ ] Confirm demo rows such as `TR-DEMO-GOOGLE` are not used as real customer devices.

## Admin QA

- [ ] `/admin/login` loads over HTTPS.
- [ ] Correct admin credentials log in successfully.
- [ ] Incorrect credentials are rejected.
- [ ] Expired or fake admin cookies redirect to `/admin/login`.
- [ ] `/api/admin/logout` clears the admin cookie.
- [ ] Protected admin pages are not reachable without an admin session.
- [ ] Admin navigation includes Products, Requests, Devices, and Analytics.

## Admin Commerce Operations QA

- [ ] Unpaid, failed, canceled, and refunded orders cannot advance production or shipping state.
- [ ] Payment-hold orders allow internal notes but reject carrier, tracking, production, and shipping changes.
- [ ] Shipping cannot advance until production is completed.
- [ ] Delivered orders cannot move backward, and shipped orders cannot return to a pre-shipment state.
- [ ] The first shipped transition preserves one `shipped_at` timestamp and attempts one tracked shipping notification.
- [ ] Artwork generation and approval actions are unavailable after shipment.
- [ ] A full refund requires explicit confirmation and stores the Stripe refund reference.
- [ ] Refunding a Multi-Link order does not silently cancel its subscription; subscription handling is completed separately.
- [ ] Admin can mark a product out of stock and server-side checkout rejects it until availability is restored.
- [ ] Admin can move contact, setup, and link-change requests through New, In progress, and Resolved with internal notes.
- [ ] Run the controlled workflow in `docs/admin-operations-runbook.md` with dedicated test data.

## Device Creation QA

- [ ] Admin can open `/admin/devices`.
- [ ] Admin can create a device code.
- [ ] Admin can auto-generate a device code.
- [ ] Admin can auto-generate an activation code.
- [ ] Plain activation code is shown only once after creation.
- [ ] Database stores `activation_code_hash`, not the plain activation code.
- [ ] Device row includes product type, service mode, status, label, and destination fields.
- [ ] Admin can copy the device URL: `https://taprater.com/r/{deviceCode}`.
- [ ] Admin can copy activation instructions.
- [ ] Admin can pause, disable, or reactivate a device.

## Activation QA

- [ ] `/activate` loads over HTTPS.
- [ ] `/activate?device={deviceCode}` pre-fills the device code.
- [ ] Invalid device code is rejected.
- [ ] Invalid activation code is rejected.
- [ ] Failed activation attempts are logged in `device_activation_attempts`.
- [ ] Repeated failed attempts are rate-limited or slowed.
- [ ] Valid activation creates or finds the customer by email.
- [ ] Valid activation creates or finds the business.
- [ ] Valid activation saves destination type and destination URL.
- [ ] Activated device is set to `active`.
- [ ] `activated_at` is saved.
- [ ] Activation does not require Stripe.

## Google Places API Key Restrictions

- [ ] The key is browser-visible by design and is stored as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- [ ] The key has website application restrictions for production domains, for example:
  - [ ] `https://taprater.com/*`
  - [ ] approved preview domains only
- [ ] The key has API restrictions for only the needed Google Maps Platform APIs:
  - [ ] Maps JavaScript API
  - [ ] Places API
- [ ] Unused Google Maps Platform APIs are disabled.
- [ ] Daily quotas are set for Places Autocomplete usage.
- [ ] Billing alerts are enabled.
- [ ] Usage is monitored after launch.
- [ ] Any previously exposed unrestricted key is rotated.

Official references:

- Google Maps Platform security guidance: https://developers.google.com/maps/api-security-best-practices
- Maps JavaScript API key setup and restrictions: https://developers.google.com/maps/documentation/javascript/get-api-key#restrict_key

## Redirect QA

- [ ] `/r/TR-DEMO-GOOGLE` behaves correctly in local/demo mode.
- [ ] Unknown device code shows a clean not-found state.
- [ ] Unactivated device opens `/activate?device={deviceCode}` or renders an activation CTA.
- [ ] Active `basic_redirect` device redirects to the configured destination URL.
- [ ] Active `managed_redirect` device redirects to the configured destination URL.
- [ ] Active `premium_landing_page` device opens or redirects to the hosted landing page.
- [ ] Paused/disabled device shows a friendly unavailable page.
- [ ] Redirect destination accepts only `http://` and `https://`.
- [ ] `javascript:` and `data:` destinations are rejected.
- [ ] Tap event logging is attempted safely and does not block redirect behavior.
- [ ] Raw IP addresses are not stored; only hashed/anonymized IP values are allowed.

## Landing Page QA

- [ ] `/l/demo` loads fallback/demo data.
- [ ] `multi_platform_review` template renders.
- [ ] `feedback_form` template renders.
- [ ] `referral_form` template renders.
- [ ] `appointment_booking` template renders.
- [ ] `social_links` template renders.
- [ ] `digital_business_card` template renders.
- [ ] Form submissions save to `form_submissions` when database persistence is configured.
- [ ] Missing database configuration or missing page shows a friendly not-found state.
- [ ] Landing page button click logging does not expose raw IP data.

## Analytics QA

- [ ] Admin analytics page loads for admin users.
- [ ] Customer analytics loads for authenticated customer users.
- [ ] Device tap counts match `tap_events`.
- [ ] Business tap counts match `tap_events`.
- [ ] 7-day and 30-day summaries calculate correctly.
- [ ] Top devices table is populated when events exist.
- [ ] Landing page submissions count matches `form_submissions`.
- [ ] No raw IP address is displayed in admin or customer analytics.

## Customer Portal QA

- [ ] `/account/login` loads.
- [ ] Resend magic-link or email-code flow works when `RESEND_API_KEY` is configured.
- [ ] Production login does not fake authentication when Resend is missing.
- [ ] Customer session cookie is signed and expires.
- [ ] Invalid or expired customer session is rejected.
- [ ] `/account` is protected.
- [ ] `/account/business` is protected.
- [ ] `/account/devices` is protected.
- [ ] Customer sees assigned businesses and devices.
- [ ] Customer can submit a destination change request.
- [ ] Customer cannot edit destination URLs directly until that workflow is explicitly approved.

## Resend Email QA

- [ ] Domain or sender identity is verified in Resend.
- [ ] Resend webhook points to `https://taprater.com/api/webhooks/resend`.
- [ ] Resend webhook sends `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`, `email.complained`, and `email.suppressed`.
- [ ] A controlled test changes from Accepted to Delivered in `/admin/settings/emails`.
- [ ] Failed order and shipping notifications can be retried once from the admin delivery log without a duplicate concurrent send.
- [ ] Contact form notification sends to `ORDER_NOTIFICATION_EMAIL`.
- [ ] Setup request notification sends to `ORDER_NOTIFICATION_EMAIL`.
- [ ] Link change notification sends to `ORDER_NOTIFICATION_EMAIL`.
- [ ] Customer login email sends when Resend is configured.
- [ ] Email templates do not include secrets or activation code hashes.
- [ ] Failed email send returns a friendly user-facing message.
- [ ] Delivery storage contains metadata only, with no HTML bodies, passwords, activation tokens, or card data.

## Storefront QA

- [ ] Homepage loads.
- [ ] Shop page loads.
- [ ] Product page loads.
- [ ] Category page loads.
- [ ] Product cards show service badges.
- [ ] Product pages explain basic redirect versus hosted landing page behavior.
- [ ] One-time products are labeled as no monthly fee required for basic activation.
- [ ] Premium hosted products are labeled as subscription required for hosted features.
- [ ] Cart persists after refresh.
- [ ] Checkout button clearly says Stripe test mode.
- [ ] Checkout API rejects live Stripe secret keys.
- [ ] Stripe test checkout redirects to Stripe-hosted Checkout when test env vars and database persistence are configured.
- [ ] Stripe test checkout returns a friendly error if Stripe or database persistence is not configured.
- [ ] No live Stripe payment processing is exposed.

## Stripe Test Checkout QA

- [ ] `STRIPE_SECRET_KEY` starts with `sk_test_`.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_`.
- [ ] `STRIPE_WEBHOOK_SECRET` starts with `whsec_`.
- [ ] `npm run build` passes with Stripe test env vars.
- [ ] Add a product to cart.
- [ ] Click `Checkout with Stripe test mode`.
- [ ] Confirm redirect to Stripe-hosted Checkout.
- [ ] Complete payment with Stripe test card `4242 4242 4242 4242`.
- [ ] Use any future expiration date, any three-digit CVC, and any ZIP/postal code.
- [ ] Confirm `/checkout/success` loads after successful test payment.
- [ ] Confirm `/checkout/cancel` loads if checkout is canceled.
- [ ] Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` locally.
- [ ] Confirm `checkout.session.completed` marks the order paid in Postgres.
- [ ] Confirm `/admin/orders` shows the paid test order.
- [ ] Do not enter real card details.

## Smoke Test

Run these commands before each production deployment:

```bash
npm run build
npm test
npm run check:platform-schema
npm run start
```

In another terminal:

```bash
npm run smoke
```

For a deployed target:

```bash
SMOKE_BASE_URL=https://taprater.com npm run smoke
```

The smoke script checks:

- `/`
- `/product/google-review-stand`
- `/admin/login`
- `/activate`
- `/r/TR-DEMO-GOOGLE`

`/r/TR-DEMO-GOOGLE` accepts either a rendered page or redirect status because demo behavior can differ between local fallback and configured database environments.

## Amazon Packaging Instructions

- [ ] NFC chip points to `https://taprater.com/r/{deviceCode}`.
- [ ] QR code points to the same permanent URL.
- [ ] Public device code is printed clearly.
- [ ] Private activation code is printed on an insert card or hidden instruction area.
- [ ] Private activation code is not visible in Amazon listing photos.
- [ ] Private activation code is not printed on the outside of retail packaging.
- [ ] Amazon listing copy says basic activation does not require a monthly fee.
- [ ] Amazon listing copy says premium dashboard/hosted features are optional.
- [ ] Insert card explains how to activate:
  - [ ] Tap or scan the stand.
  - [ ] Enter the private activation code.
  - [ ] Enter email, business name, and destination URL.
  - [ ] Save activation.
- [ ] Packaging tells customers to contact Tap Rater support if the private activation code is missing or already used.

## Security Notes

- [ ] Activation code is private and must not be treated like the public device code.
- [ ] Never print real activation codes in Amazon photos, product mockups, public docs, or support screenshots.
- [ ] Store only `activation_code_hash`; never store plain activation codes.
- [ ] Validate redirect URLs before saving or redirecting.
- [ ] Allow only `http://` and `https://` destination URLs.
- [ ] Reject unsafe schemes such as `javascript:` and `data:`.
- [ ] Restrict Google Maps keys by website and API.
- [ ] Set Google Maps quotas and billing alerts.
- [ ] Rate limit activation attempts by device, email, and IP hash where practical.
- [ ] Log activation failures without storing raw IP addresses.
- [ ] Keep `DATABASE_URL`, `NEON_DATABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- [ ] Keep admin and customer session secrets out of the browser.

## Feature Documentation Coverage

- [ ] Storefront products and service strategy: README and product pages.
- [ ] Cart persistence: README deployment checklist and tests.
- [ ] Admin login/session security: README and tests.
- [ ] Admin products: README, admin UI, and tests.
- [ ] Admin requests: README and admin UI.
- [ ] Database schema: README, `docs/supabase-schema.sql`, and `supabase/schema.sql`.
- [ ] Device redirect route: README and platform architecture.
- [ ] Activation flow: README and this checklist.
- [ ] Google Places activation search: README and this checklist.
- [ ] Admin devices: platform architecture and this checklist.
- [ ] Customer portal: README and this checklist.
- [ ] Landing pages: `docs/landing-pages.md` and this checklist.
- [ ] Analytics: platform architecture and this checklist.
- [ ] Stripe test-mode status: README and this checklist.

## Known Not Ready For Launch

- [ ] Live Stripe checkout.
- [ ] Live paid order capture.
- [ ] Live Stripe webhooks.
- [ ] Live tax calculation.
- [ ] Live shipping calculation.
- [ ] Subscription billing for premium hosted features.
