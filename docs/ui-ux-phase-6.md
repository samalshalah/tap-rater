# UI/UX Phase 6: Account Recovery and Page Titles

Implemented September 5, 2026.

## Changes

- Customer sign-in links to `/account/forgot-password`.
- Recovery uses the existing Resend sender and email-delivery tracking. Only active customer accounts receive links; environment-managed administrator credentials are excluded.
- Random 256-bit reset tokens are stored as SHA-256 hashes, expire after 20 minutes, and are consumed in the same conditional write as the password change.
- All prior customer sessions and login links are rejected after a reset, including saved billing-profile reuse at checkout. Customers sign in normally after resetting.
- Requests return an account-neutral response before account lookup/email work. Both endpoints are rate limited by hashed identifier and IP, and fail closed if the limiter is unavailable.
- Sign-in, activation, and reset passwords have accessible visibility controls. Recovery has confirmation, pending, error, and success states.
- The root title template owns the Tap Rater suffix. Static and merchant-managed page titles avoid repeated suffixes; social sharing titles are preserved.

## Database

- Migration: `supabase/2026-09-05-customer-password-recovery.sql`.
- Tested first on isolated branch `phase6-password-recovery-validation` (`br-green-forest-at6fp1or`), cloned from the currently configured application branch.
- Applied to the configured `milestone7-qa` branch (`br-restless-shape-at38e1nu`). No customer credentials were changed.
- The validation compute is suspended, with 5-minute automatic suspension if restarted. The branch is retained for inspection; deletion requires owner approval.
- The separately named Neon `production` branch was not switched to or modified. Apply this migration and the preceding schema migrations before any future database cutover.

## Owner Verification Still Required

Automated verification: 651 tests across 110 files and the OpenNext Cloudflare production build pass. Browser checks cover 320px and 390px mobile layouts, 1440px desktop, visibility controls, missing-link recovery, and error focus/retry behavior. The local runtime intentionally has no Resend key, so real inbox delivery is not asserted by local tests.

- From an active customer account you own, request a reset at `https://taprater.com/account/forgot-password` and verify inbox delivery.
- Open the email, set a new password, and confirm login succeeds with it while the previous password and already-open account sessions no longer work.
- Reopen the same reset link and verify a second reset is rejected.
- Confirm the password-change notification arrives and the support reply address is monitored.
- Administrator password recovery is not a customer reset flow; administrator credentials remain managed through deployment secrets.

These inbox/account checks are deferred until the owner is available. Stripe live-payment verification and tax/legal confirmations remain separate launch requirements.

Security reference: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
