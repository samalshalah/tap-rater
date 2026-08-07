# Tap Rater Backend

Tap Rater has a single backend surface: the Cloudflare Worker (Next.js/OpenNext) that runs the
production website, API routes, admin, activation flow, redirect engine, and customer portal.

Live Stripe payments are intentionally disabled until final approval.

## Cloudflare App Backend

The Cloudflare Worker handles:

- storefront API routes
- admin login and admin APIs
- product and CMS persistence
- contact/setup/change-link requests
- device activation
- public redirect route `/r/{deviceCode}`
- landing page form submissions
- customer login/session APIs

Required production secrets stay in Cloudflare Worker settings:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
CUSTOMER_SESSION_SECRET
DATABASE_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
ORDER_NOTIFICATION_EMAIL
ADMIN_NOTIFICATION_EMAIL
NEXT_PUBLIC_SITE_URL
```

Do not expose `DATABASE_URL` or `RESEND_API_KEY` to browser code.

## Background jobs

There is no separate background-job service. A prior scaffold (`apps/backend`, intended for future
Railway-hosted cron jobs) was removed -- every job handler in it was an unimplemented stub with zero
real functionality, and nothing in the app depended on it. If a real recurring job is needed later
(e.g. a daily report), add it scoped to what that job actually needs, not as standing infrastructure
ahead of time.

## Email Utility

Shared website email helpers live in:

```text
src/lib/email.ts
```

Supported email types:

- customer login magic link
- quote request notification
- quote request confirmation
- feedback alert
- link change request
- scheduled report placeholder

The helper escapes dynamic content before building HTML and returns a safe skipped result when `RESEND_API_KEY` is missing.

## Verification

Run:

```bash
npm run build
npm test
npm run cf:build
```

For production, verify:

- Cloudflare Worker still serves `/`, `/shop`, `/activate`, `/admin/login`, and `/r/TR-DEMO-GOOGLE`.
- Resend domain is verified before production emails are enabled.
