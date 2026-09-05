# Commerce Phase 2: Account, Invoice, and Email Recovery

Date: September 5, 2026. Stripe remains in test mode.

## Status

**Complete in test mode.** Engineering, deployed failure recovery, duplicate-event
replay, and fresh first-pass checkout acceptance are verified. The owner-approved
Workers Paid upgrade and an explicit runtime-limit deployment closed the capacity
gate. This does not approve live launch, inbox delivery, or owner account activation.

- Current Worker: `5cf96db6-18ca-4bb8-85aa-483d9b8bab0e` (`tap-rater-app-git`).
- Prior Phase 2 Worker: `893445a3-c31b-43ca-88c8-e1bc0d2711cb`.
- Previous Phase 1 Worker: `206d8d6f-14a3-492e-ac9c-c0140deba84f`.
- Active app database: Neon `milestone7-qa`, `br-restless-shape-at38e1nu`.
- Pre-migration checkpoint: `br-blue-sound-atiyaig1`, no compute, created at
  `2026-09-05T18:33:27Z`. The separately named production branch was not changed.
- Applied additive migration: `supabase/2026-09-05-commerce-recovery.sql`.
- Configured `COMMERCE_RECOVERY_SECRET` in Cloudflare without exposing its value.

## Implemented

- Paid checkout and invoice work records pending/failed/completed jobs before
  processing. Failures return a retryable response rather than being acknowledged
  as successful. Stripe retries and admin retries use the same durable records.
- Admin > Email Templates > Payment recovery shows outstanding work and a Retry
  action. Retry re-fetches the authoritative Stripe object, requires admin access,
  and rejects cross-mode recovery. It does not create another payment.
- Paid account retries preserve existing customers, deterministic businesses, and
  valid activation credentials. Active customers are not sent another activation;
  disabled customers remain disabled. Completion receipts are written last.
- Invoice lookup/write/item failures propagate. Invoice writes are serialized;
  recurring events do not overwrite the initial checkout's item composition.
- Commerce email requests use stable idempotency keys and encrypted immutable
  payloads. Provider-accepted messages are not resent. Accepted payloads are
  cleared; delivery metadata is retained separately.
- Existing proven provider acceptance is adopted for historical emails. Unknown
  historical outcomes and uncertain sends older than 23 hours require review,
  leaving a margin before Resend's 24-hour idempotency-key expiry.

There is no new background cron. Stripe automatic retries are finite; staff must
monitor the recovery panel and retry after resolving the underlying failure.

## Verification

- 729 tests passed across 114 files. The regular suite skips the separately gated
  integration suites; all 8 database tests passed when explicitly run against
  isolated branch `br-tiny-truth-atyl121r`.
- Isolated tests cover failed-job persistence, retry completion, completed-job
  replay, encrypted identical email retries, cleared accepted payloads, and
  customer/business/token reuse after mail failure. No fixture emails were sent.
- Unit tests cover provider acceptance with lost acknowledgement, historical and
  23-hour review guards, admin authorization, cross-mode rejection, partial
  invoice writes, and preservation of existing customer status.
- TypeScript and the OpenNext production build passed; 1017 image variants built.
- Local recovery UI tested at 390 x 844 and 1440 x 1000. Loading disables retry,
  failure retains the record, and the mobile document has no horizontal overflow.
- Deployed home, shop, product, cart, checkout, account login, and authenticated
  email settings returned 200. Unauthenticated recovery POST returned 401.

## Deployed Test Evidence

Dedicated QA order, never fulfill:

- Order: `3c2bd7cc-7d2c-47f2-886e-a71e5b05aba5`.
- Checkout: `cs_test_b1yd1tuTqeMiZbXCHEIFPeNJWsjyUJa6xNdK75L2nNWIf2mGnEJL86lKNI`.
- Payment: `pi_3UCOSFJfXGmPO60V0QjVEh3l`, $53.34 test funds only.
- Invoice: `in_1UCOSHJfXGmPO60VbKkpA5ow`, paid with one stored item.
- Checkout event: `evt_1UCOSLJfXGmPO60VxrbaTfua`.
- Account creation was explicitly selected. One pending account and encrypted
  activation credential were persisted; activation email was provider accepted.
- The first webhook stopped before order emails, retaining the pending job.
  Its response was 503, `Stripe processing lease was lost. Retry this event.`
- Admin retries repaired the customer order and admin notification emails. At
  `18:47:52Z`, checkout recovery completed on its third processing attempt and the
  outstanding recovery queue became empty. All three outbox entries are accepted,
  with payloads cleared. Each message type has one provider-accepted delivery row;
  one earlier admin attempt remains `sending` in historical attempt metadata.
- Stripe replay at `18:48:29Z` returned 200. Customer count remained one, accepted
  email counts stayed unchanged, and the completed job was not processed again.
- Dedicated test refund succeeded: `re_3UCOSFJfXGmPO60V0u7odCxF`. The order is
  `canceled/refunded`; refund-created/updated and charge-refunded deliveries all
  returned 200. No real money or physical fulfillment was involved.
- Provider acceptance is not inbox-delivery or account-activation proof.

Cloudflare Dashboard originally showed **Workers Free** as the current account plan, with
50 subrequests per invocation. The observed mid-request failures are consistent
with that limit; retries made durable progress and eventually completed. A
sufficiently provisioned runtime must be verified before first-pass acceptance.
That historical recovery test remains evidence of durable progress, not evidence
of first-pass completion. The capacity gate was subsequently closed below.

## Paid Runtime Acceptance

On September 5, the owner explicitly approved **$5/month plus usage**. Cloudflare
checkout displayed Purchase complete and subscription active; the account plans
page independently showed Paid as the current plan. This is a real hosting charge,
separate from the Stripe test transactions. No Stripe live-mode changes were made.

An immediate test after upgrading the account still returned 503 on the previous
Worker version. The settings API reported standard usage with no explicit limits.
The failure was not conclusively traced to its underlying runtime exception, so
do not claim that the account purchase alone fixed the request.

`wrangler.jsonc` now explicitly sets 30,000 ms CPU and 1,000 subrequests per
invocation. The previously built and tested app was redeployed without application
code changes. The Cloudflare settings API confirmed these exact deployed limits.
They bound individual requests, not the monthly hosting bill.

Dedicated immediate-after-upgrade QA order, never fulfill:

- Order: `2b2352db-d8c0-4e16-bbac-5c38df03bbe8`.
- Checkout: `cs_test_b1Y5AR6S3Mlt2m7CBsOvaIyDsBuHBeTVJty3mmwitaxp5p87VCW4gnKwzQ`.
- Event: `evt_1UCOlsJfXGmPO60VZ1Y6TWiM`; initial 503 at `18:57:03Z`.
- After allowing the original lease to expire, the admin retry at `19:02:19Z`
  completed on processing attempt 2. All three email types have one accepted
  delivery each. Checkout replay at `19:02:38Z` returned 200.
- Full test refund: `re_3UCOlmJfXGmPO60V16edJbAP`, $53.34; canceled/refunded.

Fresh first-pass acceptance on the explicit-limit deployment, never fulfill:

- Order: `35cf3d65-70dd-4f0b-8c62-73dcd2f5a4ff`.
- Checkout: `cs_test_b1d97WSkPqNOcj7nwrZoFYOcnUux9j6HnTFzrEsEBG5YNufbI6jKzZYKPl`.
- Payment: `pi_3UCOssJfXGmPO60V0cQ4CmAo`, $53.34 test funds only.
- Invoice: `in_1UCOsuJfXGmPO60VhXfVZpxm`, paid with one stored item, invoice
  and PDF links, and correct customer ownership.
- Event: `evt_1UCOsxJfXGmPO60Vc7E10abO`. Stripe recorded automatic checkout
  delivery HTTP 200 at `19:04:22Z`; invoice delivery was 200 at `19:04:21Z`.
- Both durable jobs completed on **attempt 1**. No manual retry was used for
  this checkout. Account creation was selected and reused the existing pending
  owner QA account; customer count remained one. Each dedicated order has its
  own business record, with no additional record created on replay.
- Activation, customer order confirmation, and admin order notification each
  have exactly one provider-accepted delivery; all three encrypted outbox
  payloads are cleared. This is not proof of inbox delivery or activation.
- Checkout replay at `19:05:28Z` returned 200. Processing attempts stayed at 1,
  and email, customer, and business counts stayed unchanged.
- Full test refund: `re_3UCOssJfXGmPO60V0t5G8Ry5`; canceled/refunded, $53.34
  refunded, zero pending refund amount. No physical fulfillment occurred.
- During each refund, one overlapping notification returned a retryable 500
  while companion events and the admin action saved the correct refund state.
  The final order's charge-refunded replay returned 200 at `19:06:31Z`; the
  earlier order's refund-created replay returned 200 at `19:07:00Z`. Historical
  failures remain visible and must not be represented as first-pass refund proof.
- Final reconciliation at `19:07:51Z`: zero outstanding recovery jobs; both
  orders fully refunded; all six outbox payloads cleared; no duplicate accepted
  messages. Detailed evidence is under `artifacts/ecommerce-phase-2/paid-runtime*`.
- Post-change checks: 729 unit tests pass, TypeScript passes, Cloudflare type
  generation and Wrangler dry run pass, seven deployed routes return 200, and
  unauthenticated recovery POST returns 401. The eight isolated database tests
  were proven in the preceding implementation run; the regular suite skips them.

## Operations and Key Custody

1. Open `/admin/settings/emails` and inspect Payment recovery. Resolve the
   underlying database, Stripe, account, or provider error, then Retry.
2. A processing lease lasts five minutes. After a failed/crashed request, allow
   its lease to expire. Never delete active leases to force concurrency.
3. For an expired activation, use Customers > Resend activation first. Recovery
   preserves the new valid manual link. Existing valid legacy/manual activation
   links are not silently rotated; verify their delivery or resend through that
   explicit customer operation. Disabled accounts require an owner access decision.
4. `needs_review` emails must be reconciled with Resend using their idempotency
   key and provider message ID. Retry can adopt a proven accepted delivery record.
   Do not clear review guards, change keys, or mark jobs complete to hide failures.
   A genuinely unaccepted old message needs an explicitly reviewed resend.
5. `COMMERCE_RECOVERY_SECRET` is a random 32-byte key represented as 64 hex digits.
   It is separate from session and webhook secrets. An encrypted, Windows-user-
   bound DPAPI backup is in ignored `.wrangler/commerce-recovery-key.dpapi`.
   This backup is not portable disaster recovery. Before live launch, arrange
   owner-controlled vault custody and test restoration as part of Phase 4.
6. Do not rotate this key while pending payloads or activation credentials depend
   on it. A rotation needs a versioned decrypt/re-encrypt migration. Never print,
   commit, include in screenshots, or send the key to a customer.

`email_deliveries` remains metadata-only. The new outbox intentionally stores
encrypted email bodies while pending; customers retain encrypted activation
credentials until activation or explicit rotation clears them. Database access
plus the recovery key can decrypt these values, so both need protected backups.

Sources: [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Stripe retries](https://docs.stripe.com/webhooks),
[Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/).
Runtime configuration: [Wrangler limits](https://developers.cloudflare.com/workers/wrangler/configuration/#limits).
