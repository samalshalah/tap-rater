# Readiness phase 1: public form spam protection

Date: 2026-09-28

## Status

Implementation and local verification complete. Application code is NOT pushed or deployed.
Publishing this work with the pending SEO/analytics changes is readiness phase 2.
The live forms remain on the old application code until that release.

Cloudflare setup completed in the owner's signed-in account:

- Managed widget: `Tap Rater Support Forms`.
- Allowed hostname: `taprater.com` (Cloudflare also permits its subdomains; the server accepts only `taprater.com` and `www.taprater.com`).
- Public site key: `0x4AAAAAAFG1TOPm653FScSd`.
- Pre-clearance disabled; existing WAF protections are unchanged.
- Worker `tap-rater-app-git`: `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` saved as encrypted runtime values.
- The dashboard applied a configuration-only deployment to the existing Worker code. No application release, Stripe changes, or database changes were made.
- The private key was not written to source files, screenshots, or this document.

## Changes

- Contact, setup, and link-change forms use a shared responsive Turnstile component.
- Server calls Cloudflare Siteverify before saving a request, uploading artwork, or sending notifications.
- Missing, oversized, invalid, expired/replayed, wrong-hostname and wrong-action tokens are rejected.
- A hidden honeypot rejects common automated submissions.
- Production refuses Cloudflare dummy keys and fails closed when verification configuration or edge limiters are unavailable.
- Separate support-form limits leave checkout, artwork setup and hosted-page submission limits unchanged.
- Shared support limit: 3 attempts per minute per Cloudflare-provided client IP.
- Duplicate limit: 1 normalized identical request per minute per form, independent of IP. Limit keys are hashes, not raw emails, messages, or addresses. These are Cloudflare edge throttles, not an exactly-once transactional guarantee.
- Both Wrangler configurations declare the two new limiters; generated binding types and readiness checks were updated.
- Network failures show a retryable form error. Submission attempts refresh the single-use challenge token while preserving form inputs.
- CSP permits the Turnstile script and iframe. Development-only eval supports Next's dev runtime; production continues to exclude eval.
- Privacy page describes Turnstile processing and links to Cloudflare's privacy policy.

## Verification

- Full scoped unit suite: 154 files, 1,292 passing tests. No production database integration suite was run.
- Scoped TypeScript check: 488 roots, zero diagnostics.
- Recovery configuration: 48 checks passed.
- 36 new security/route regression tests plus 2 environment-specific CSP cases.
- Local HTTP: all three otherwise-valid submissions without a token returned 400 before any side effect.
- Chrome desktop contact form: official test widget completed and enabled submission.
- Chrome mobile contact at 375px: no horizontal overflow; compact verification widget visible.
- Chrome setup and link-change forms at 320px: no horizontal overflow; test verification enabled both submit buttons.
- Intentionally invalid contact fields returned validation feedback, preserved inputs, and refreshed the challenge. No record, attachment, or notification was created.
- Browser viewport overrides reset after testing.

Evidence:

- `artifacts/spam-phase1-contact-mobile.png`
- `artifacts/spam-phase1-cloudflare-secrets.png` (encrypted values only)

Local preview: `http://127.0.0.1:3031/contact-us`, using official public dummy keys supplied only in the development process environment. Do not use these keys for deployment.

## Phase 2 release checklist

1. Preserve the existing encrypted Turnstile keys when deploying `tap-rater-app-git`.
2. Build and package the reviewed source, including `SUPPORT_FORM_RATE_LIMITER` (namespace 724004, 3/60 seconds) and `SUPPORT_FORM_DUPLICATE_LIMITER` (namespace 724005, 1/60 seconds).
3. Confirm production `/api/site/form-security` returns the real public site key with `Cache-Control: no-store`, never a secret or test key.
4. Confirm the live contact/setup/link-change widgets render and the production CSP contains no `unsafe-eval`.
5. Exercise one clearly identified owner-approved live support request and confirm one saved record and one notification. Check missing-token rejection without creating records. Do not claim live enforcement before these checks.

## Local preview repair

An earlier OpenNext packaging run had modified files inside the shared local Next dependency. The dev server failed before rendering forms (`__openNextAls.getStore`, then client-module proxy errors).
Restored `node_modules/next` from the official `next@16.3.4` npm archive, without changing dependency versions or lockfiles. No application behavior was patched to conceal the failure.
Old generated `.next` cache is preserved under `artifacts/spam-phase1-next-cache-backup`.
Future release snapshots should not share writable dependencies with the active dev server when OpenNext packaging patches them. Reinstall the exact locked dependencies before returning to local development if packaging modifies them.
