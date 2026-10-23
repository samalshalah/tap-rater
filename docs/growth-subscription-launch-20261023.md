# Growth subscription rollout

Status: implemented locally and verified with the dedicated Tap Rater Stripe sandbox and isolated google-client-staging-20261022 database. Not deployed; live billing remains disabled.

## Offer

$29 per location per month only. No annual option. Stand purchases remain one-time charges. Growth can be bought separately at /growth or added to a stand checkout after customer sign-in. Multi-Link subscriptions must be purchased separately.

Per subscribed location: 300 AI review reply generations, 10 GBP improvement generations, three keywords and four monthly ranking updates on up to a 7x7 grid (588 points). AI regenerations/failed attempts consume allowance. Usage resets on the New York calendar month. No automatic overage charges. Replies and profile changes remain drafts; directory distribution is excluded.

## Payment and access

The server fixes prices, validates monthly cadence, requires renewal consent and binds each purchase attempt to the authenticated customer. A database lease and Stripe idempotency prevent duplicate sessions. An open checkout is reserved for one hour; repeat requests resume it, and conflicting requests are rejected. Expired/failed checkout events release the reservation. Access is granted from verified webhooks after retrieving the current subscription and paid latest invoice, never from the success redirect. Cancellation at period end preserves paid access until expiry. Immediate cancellation/payment failure disables access. Existing content is preserved.

The customer billing portal supports invoices, payment methods and cancellation at period end. Plan/quantity changes are disabled in the portal for this release. Support must coordinate refunds/disputes with cancellation; automatic subscription revocation on refunds/disputes is not implemented.

## Release prerequisites

1. Apply the prerequisite package access and competitor schemas, then 2026-10-23-marketing-entitlements-spam.sql and 2026-10-23-marketing-subscriptions.sql before releasing the application. These have only been applied to staging. The entitlement migration pauses the ranking provider.
2. Configure a LIVE Stripe customer portal configuration with invoice history, payment method updates and period-end cancellation. Set MARKETING_PORTAL_CONFIGURATION_ID to its live ID. Sandbox configuration IDs cannot be used live.
3. Confirm the production signed webhook receives checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, invoice.paid, invoice.payment_failed, customer.subscription.created, customer.subscription.updated and customer.subscription.deleted. Keep existing commerce events enabled.
4. Set MARKETING_CHECKOUT_ENABLED=true only after production release approval and live payment configuration verification. Never set MARKETING_TEST_ENTITLEMENTS=true against production. Existing store tax configuration needs review for the new digital subscription; Stripe Tax was not enabled by this implementation.
5. Verify account activation email delivery and a full hosted checkout return through the deployed webhook before retail launch. Sandbox tests exercised Stripe API checkout creation and the application lifecycle handler, not delivery to the deployed webhook. Ranking schedules remain paused until separately approved; no paid scans were run.

## Verification

Production webpack build passed before the monthly-only correction; subsequent TypeScript and targeted tests cover that correction. 71 checkout/subscription tests passed after removing annual billing, including a real isolated Stripe sandbox lifecycle test: monthly standalone and stand bundle totals, duplicate protection, portal session creation, paid activation, two-location ceiling, separate 300/10 AI allowances and cancellation. The local purchase page was inspected in Chrome and confirmed monthly-only. Earlier commerce and access regression suites passed; known unrelated baseline suite failures are documented in marketing-access-launch-20261023.md.

No live customers were charged, no Google data was published, and no production migration or deployment was performed.
