# Tap Rater

Tap Rater is a Next.js ecommerce storefront for NFC review stands and review plates, plus a platform foundation for permanent device URLs, activation, analytics, and future hosted reputation pages. Phase 1 sells only tabletop stands and flat plates while cards, name tags, badges, bundles, and platform products remain postponed or quote-based.

Stripe checkout is available in test mode only until the business bank account and final live payment setup are explicitly approved.

## Stack

- Next.js storefront for product pages, categories, cart, and SEO content.
- Static `migratedProducts` catalog fallback so local preview and builds work without database credentials.
- Postgres-backed admin/CMS for homepage content, product records, request inbox data, platform devices, activation, analytics, and ecommerce settings. Supabase and Neon are supported.
- Resend notifications for customer inquiry forms.
- Stripe Checkout test mode foundation. Live payment processing is not enabled.

## Local Setup

```bash
git clone https://github.com/samalshalah/tap-rater.git
cd tap-rater
git checkout nextjs-commerce
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm test
npm run smoke
npm run check:platform-schema
npm run cf:build
npm run backend:build
npm run backend:db-check
```

Local dev usually runs at:

```text
http://localhost:3000
```

`npm run smoke` expects a running local server at `http://127.0.0.1:3000` by default. To test another target:

```bash
SMOKE_BASE_URL=https://taprater.com npm run smoke
```

## Environment Variables

Create `.env.local` for local development. Do not commit real secret values.

### Required For Admin Login

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
CUSTOMER_SESSION_SECRET=
```

`ADMIN_SESSION_SECRET` should be a long random value. Optional admin session TTL:

```env
ADMIN_SESSION_TTL_HOURS=168
```

`CUSTOMER_SESSION_SECRET` signs customer portal login links and account sessions. Use a separate long random value in production.

### Required For Database Persistence

Neon/Postgres deployment:

```env
DATABASE_URL=
```

`NEON_DATABASE_URL` is also accepted as an alternative variable name.

Supabase deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`DATABASE_URL`, `NEON_DATABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only. Do not expose them in browser code. If both Supabase and Neon variables are present, Supabase is used first.

### Required For Notifications

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ORDER_NOTIFICATION_EMAIL=
ADMIN_NOTIFICATION_EMAIL=
```

`ORDER_NOTIFICATION_EMAIL` is used as the internal destination for customer request notifications.
`ADMIN_NOTIFICATION_EMAIL` is used by backend jobs and operational tests.
`RESEND_FROM_EMAIL` should use a verified Resend sender, for example `Tap Rater <notifications@taprater.com>`.

Customer portal login uses Resend magic links when `RESEND_API_KEY` is configured. If Resend is missing, production customer login is disabled with a friendly message. Local development may return a test login link only for `ADMIN_EMAIL`.

### Public URL

```env
NEXT_PUBLIC_SITE_URL=
```

Use the production domain for deployment, for example `https://taprater.com`.

### Google Business Search

Google Business Profile search on `/activate` uses a browser-visible Google Maps JavaScript API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

This key is public by design, so lock it down before using it outside local testing:

- Restrict the key to the Tap Rater domains that can load activation, such as `https://taprater.com/*` and the approved preview domains.
- Restrict the key to only the needed Google Maps Platform APIs, currently Maps JavaScript API and Places API.
- Set daily quota and billing alerts for Places Autocomplete usage.
- Rotate any old key that was exposed without domain, API, or quota restrictions.

The activation flow requests only `place_id`, `name`, and `formatted_address` from Places Autocomplete, restricted to US establishments.

### Stripe Checkout Test Mode

Stripe Checkout is available for test mode only. The checkout API rejects live secret keys and requires a `sk_test_` key.

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

For local webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Then copy the `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

Use Stripe test cards only. The standard successful test card is `4242 4242 4242 4242` with any future expiration date, any three-digit CVC, and any ZIP/postal code.

Do not enable live payment processing until the business bank account and live Stripe account are explicitly approved.

## Database Table Checklist

Run `supabase/schema.sql` before testing activation, device redirects, hosted landing pages, analytics, or Stripe test orders. The same SQL works in Supabase SQL editor or Neon SQL editor. The app expects these platform tables when database persistence is enabled:

- `customers`
- `businesses`
- `devices`
- `landing_pages`
- `tap_events`
- `form_submissions`
- `device_activation_attempts`

The same schema file also includes the storefront, admin, request, CMS, media, and test-order tables:

- `site_content`
- `products`
- `orders`
- `media_assets`
- `contact_requests`
- `setup_requests`
- `change_link_requests`

The storefront remains safe without database credentials because it falls back to the static migrated product catalog.

Product records include ecommerce strategy fields:

- `product_type`: `physical_redirect`, `physical_managed`, `platform_landing_page`, or `bundle`
- `service_mode`: `basic_redirect`, `managed_redirect`, `hosted_landing_page`, or `multi_location_platform`
- `checkout_mode`: `buy_now`, `request_quote`, `subscription`, or `contact_sales`
- `requires_account`
- `requires_landing_page`
- `requires_subscription`
- `supported_destinations`: `google`, `facebook`, `yelp`, `tripadvisor`, `instagram`, `tiktok`, `booking`, `website`, `menu`, `wifi`, `feedback`, `referral`, and `custom`

Only `checkout_mode = buy_now` products use the current one-time Stripe test checkout path. Quote, subscription, and contact-sales products route customers to a contact/setup flow until those workflows are built.

Current Phase 1 product scope is documented in `docs/phase-1-products.md`.

## Database Schema Setup

The canonical deployment schema is:

```text
supabase/schema.sql
```

To apply it:

1. Open the Supabase SQL editor or Neon SQL editor.
2. Review `supabase/schema.sql`.
3. Run it against the target project.
4. Run the local safety check:

```bash
npm run check:platform-schema
```

For local development or a non-production database project, you may also run:

```text
supabase/demo-seed.sql
```

That optional seed creates demo devices:

- `TR-DEMO-GOOGLE`
- `TR-DEMO-SOCIAL`
- `TR-DEMO-FEEDBACK`

The schema file is intentionally non-destructive. It uses `create table if not exists` and `create index if not exists`. The optional demo seed uses `insert ... on conflict do nothing`.

Platform schema tables:

- `customers`
- `businesses`
- `devices`
- `landing_pages`
- `tap_events`
- `form_submissions`
- `device_activation_attempts`

The demo activation hashes are development examples only. Replace them with real hashed activation codes before manufacturing or production use, and do not print real activation codes in public listing images.

Landing page template JSON for premium hosted pages is documented in:

```text
docs/landing-pages.md
```

## QA And Launch Checklist

Before selling or shipping devices that point to `/r/{deviceCode}`, use:

```text
docs/launch-checklist.md
```

The checklist covers environment variables, Supabase schema installation, admin login, device creation, activation codes, activation flow, Google Places API key restrictions, redirect testing, landing page testing, analytics testing, customer portal testing, Resend email testing, Amazon packaging instructions, and security notes.

Pre-launch command sequence:

```bash
npm run build
npm test
npm run check:platform-schema
npm run start
npm run smoke
```

## Railway Backend Jobs

The production website, admin, activation flow, and redirect engine stay on Cloudflare Workers/OpenNext.
Railway is reserved for future backend jobs and operational tasks only.

Backend package:

```text
apps/backend
```

Backend commands:

```bash
npm run backend:dev
npm run backend:build
npm run backend:start
npm run backend:db-check
npm run backend:email-test
```

Railway project target:

```text
tap-rater-backend
```

Railway environment variables:

```text
DATABASE_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
ORDER_NOTIFICATION_EMAIL
ADMIN_NOTIFICATION_EMAIL
CRON_SECRET
NEXT_PUBLIC_SITE_URL
NODE_ENV=production
```

Do not add live Stripe variables to Railway until live checkout is explicitly approved.

More details:

```text
docs/backend.md
docs/railway.md
docs/resend.md
```

## Device Activation

Every Tap Rater NFC chip and QR code should point to the permanent route:

```text
https://taprater.com/r/{deviceCode}
```

If a device is still unactivated, the redirect route sends the customer to:

```text
/activate?device={deviceCode}
```

The activation form asks for:

- device code
- private activation code
- customer email
- customer name
- business name
- destination type
- destination URL

Activation writes server-side only through `POST /api/activate`. When activation succeeds, it creates or finds the customer, creates or finds the business, sets the device to `active`, saves `customer_id`, `business_id`, `destination_type`, `destination_url`, and `activated_at`, then future scans route through `/r/{deviceCode}`.

Supported activation destination types:

- `google_review_url`
- `direct_url`
- `facebook_url`
- `yelp_url`
- `booking_url`
- `social_url`

Destination URLs must use `http://` or `https://`. Unsafe schemes such as `javascript:` and `data:` are rejected.

Activation requires the platform database schema and server credentials. For Neon, set:

```env
DATABASE_URL=
```

For Supabase, set:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

No Stripe configuration is required for activation.

## Deployment Checklist

- For Cloudflare, deploy this app as a Worker with OpenNext. Do not use the older Pages command `@cloudflare/next-on-pages`; Tap Rater has SSR pages, API routes, admin auth, activation, and redirect logic that should run through OpenNext on Workers.
- Set required environment variables in the deployment platform.
- Run `npm run build`.
- Run `npm run cf:build` for the Cloudflare Worker bundle.
- Run `npm test`.
- Run `npm run smoke` against the local production server or deployed URL.
- Test public product pages and category pages.
- Test cart persistence after refresh.
- Test Stripe checkout with test cards only.
- Test Stripe webhook order creation with the Stripe CLI.
- Test customer forms: contact, setup, and change-link.
- Test admin login at `/admin/login`.
- Test admin product editing and requests inbox.
- Confirm database writes are working where persistence is expected.
- Connect bank account and enable live Stripe only after explicit approval.

Cloudflare Worker commands:

```bash
npm run cf:build
npm run deploy
```

The active Cloudflare Worker is:

```text
tap-rater-app-git
```

The production domains `https://taprater.com` and `https://www.taprater.com` are routed to that Worker. Cloudflare Workers Git integration is the source-of-truth deployment path for the `nextjs-commerce` branch. The repository also keeps a manual GitHub Actions validation workflow for tests and bundle generation only:

```text
.github/workflows/deploy-cloudflare-worker.yml
```

Do not add Cloudflare API tokens to GitHub Actions unless a new deployment workflow is intentionally approved. The active Worker deployment config is `wrangler.cloudflare-git.jsonc`; `wrangler.jsonc` is kept aligned to the same Worker name for local Wrangler commands.

Set production secrets in Cloudflare Workers, not in Git:

```bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler secret put CUSTOMER_SESSION_SECRET
npx wrangler secret put DATABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put ORDER_NOTIFICATION_EMAIL
npx wrangler secret put ADMIN_NOTIFICATION_EMAIL
```

Stripe secrets should stay test-mode only until live checkout is explicitly approved.

## Known Not Live Yet

- Live Stripe payments.
- Live paid orders.
- Live Stripe webhooks.
- Live tax calculation.
- Live shipping calculation.
- Subscription billing for premium hosted features.

Stripe checkout is test-mode only until live payments are explicitly approved.
