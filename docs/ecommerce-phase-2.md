# Commerce Phase 2: Account, Invoice, and Email Recovery

Date: September 5, 2026. Stripe remains in test mode.

## Status

Engineering is implemented and deployed. **Release acceptance is still open.**
The deployed test exposed a runtime-capacity problem while completing all account
and email work in one request. Do not mark this phase or the store launch ready.

- Current Worker: `893445a3-c31b-43ca-88c8-e1bc0d2711cb` (`tap-rater-app-git`).
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

Cloudflare Dashboard showed **Workers Free** as the current account plan, with
50 subrequests per invocation. The observed mid-request failures are consistent
with that limit; retries made durable progress and eventually completed. A
sufficiently provisioned runtime must be verified before first-pass acceptance.
Workers Paid was shown as **$5/month plus usage**. Upgrade approval was requested;
no plan purchase was made. Do not repeatedly create test charges to probe this.
After capacity is resolved, run one fresh dedicated test to prove first-pass
completion, then reconcile and refund it. The existing job is already complete.

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
