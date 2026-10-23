# New customer signup verification — October 23, 2026

Application commit 41c8845 deployed as Cloudflare version 76e633ca-0d39-4dff-8378-46ad4e5130a3.

Fixed registration reporting success when activation-email delivery fails. Provider failures now return a generic retryable 503 without exposing provider details. Updated the activation page and email to describe all subscribed tools rather than only Multi-Link.

36 tests passed across eight suites: registration success/failure/origin/rate limiting, account activation, access gates, allowance checks, admin activation, isolated database activation, isolated location/spam limits and Stripe sandbox lifecycle. The database activation test verifies email verification, password hashing, token clearing, rejection of token reuse and no marketing entitlement before payment. Sandbox purchase tests verify monthly standalone and bundled totals, paid access, per-location limits and cancellation. No live payment or paid ranking/AI request was made.

Webpack production build, type checking and OpenNext packaging passed. Browser confirmed the deployed activation wording. Publishing remains disabled and production test entitlements remain disabled.

Live signup email delivery and full customer browser activation are pending the user's choice of a test email address. Do not claim end-to-end live signup verification from these isolated tests. No live test registration was sent during this turn.

Screenshot: artifacts/growth-subscription/activation-screen-verified.png. Local source must be included in the usual Git deployment source before its next rollout.
