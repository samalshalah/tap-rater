# Tap Rater Deployment

Tap Rater currently has two Cloudflare Worker deployments:

- Manual rollback Worker: `tap-rater-app`
- Git-linked Worker: `tap-rater-app-git`

Do not delete or retire `tap-rater-app` until `tap-rater-app-git` is approved for final custom-domain cutover.

## Manual Rollback Worker

- Worker name: `tap-rater-app`
- URL: `https://tap-rater-app.sam-alshalah1.workers.dev/`
- Source today: manual GitHub Actions workflow runs `npx wrangler deploy`
- Repo: `samalshalah/tap-rater`
- Branch: `nextjs-commerce`
- Wrangler config: `wrangler.jsonc`
- Compatibility date: `2026-07-09`
- Compatibility flags: `nodejs_compat`
- Assets binding: `ASSETS`
- Public variable in config: `NEXT_PUBLIC_SITE_URL=https://taprater.com`
- Custom domains: none
- Routes: none

Required Worker secret names:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `CUSTOMER_SESSION_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ORDER_NOTIFICATION_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`

Secret values must not be committed or printed in logs.

## Runtime Variable Inventory

Required for the current Worker runtime:

| Variable | Type | Required for | Current status |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public variable | Absolute URLs, SEO metadata, customer login links | Present in both Wrangler configs. Use the active Worker URL before custom domain cutover. |
| `DATABASE_URL` | Secret | Neon persistence for products, requests, devices, activations, tap events, orders | Present on both Workers. |
| `ADMIN_EMAIL` | Secret | Admin login | Present on both Workers. |
| `ADMIN_PASSWORD` | Secret | Admin login | Present on both Workers. |
| `ADMIN_SESSION_SECRET` | Secret | Signed admin session cookie | Present on both Workers. |
| `CUSTOMER_SESSION_SECRET` | Secret | Signed customer session cookie and login links | Present on both Workers. |
| `ORDER_NOTIFICATION_EMAIL` | Secret | Contact/setup/link-change notification recipient | Present on both Workers. |
| `RESEND_API_KEY` | Secret | Email sending through Resend | Present on both Workers. |
| `RESEND_FROM_EMAIL` | Secret | Verified sender address for Resend | Present on both Workers. Resend currently shows `taprater.com` as not started, so live sending may fail until DNS verification is finished. |

Optional or feature-specific variables:

| Variable | Type | Used for | Cutover note |
| --- | --- | --- | --- |
| `ADMIN_NOTIFICATION_EMAIL` | Secret | Backend email test recipient | Present on both Workers, but not required for the main Next.js Worker runtime. |
| `NEON_DATABASE_URL` | Secret | Alternative alias for `DATABASE_URL` in the adapter | Not needed if `DATABASE_URL` is set. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public/server variable | Alternative Supabase persistence mode | Not needed for the Neon deployment. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Alternative Supabase persistence mode | Not needed for the Neon deployment. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public variable | Google Places search in activation | Optional; manual URL entry works without it. |
| `ADMIN_SESSION_TTL_HOURS` | Variable | Override admin session expiry | Optional; defaults to 7 days. |
| `STRIPE_SECRET_KEY` | Secret | Stripe test checkout only | Optional and intentionally deferred. Do not add live Stripe keys. |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe test webhook only | Optional and intentionally deferred. Do not add live Stripe keys. |
| `CRON_SECRET` | Secret | Separate backend job service | Not required for the Cloudflare Worker storefront. |

Current Worker variable comparison:

| Variable | `tap-rater-app` | `tap-rater-app-git` | Source for value | Action |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | Wrangler config | Set to Worker URL on test Worker; switch to `https://taprater.com` at custom-domain cutover. |
| `DATABASE_URL` | Yes | Yes | Neon dashboard or secure deployment vault | Done. |
| `ADMIN_EMAIL` | Yes | Yes | Local secure env / owner setting | Done. |
| `ADMIN_PASSWORD` | Yes | Yes | Local secure env / owner setting | Done. |
| `ADMIN_SESSION_SECRET` | Yes | Yes | Local secure env / generated secret | Done. |
| `CUSTOMER_SESSION_SECRET` | Yes | Yes | Generated secret | Done. |
| `ORDER_NOTIFICATION_EMAIL` | Yes | Yes | Admin/owner recipient | Done. |
| `ADMIN_NOTIFICATION_EMAIL` | Yes | Yes | Admin/owner recipient | Done. |
| `RESEND_API_KEY` | Yes | Yes | Resend dashboard | Done with a dedicated sending-only key for `tap-rater-app-git`. |
| `RESEND_FROM_EMAIL` | Yes | Yes | Verified Resend sender/domain | Done, but Resend domain verification for `taprater.com` is still required before relying on live email delivery. |

## Git-Linked Worker Build

Cloudflare Workers Builds was connected to GitHub with:

- Build project / Worker name: `tap-rater-app-git`
- URL: `https://tap-rater-app-git.sam-alshalah1.workers.dev/`
- Repo: `samalshalah/tap-rater`
- Production branch: `nextjs-commerce`
- Root directory: `/`
- Wrangler config for this test Worker: `wrangler.cloudflare-git.jsonc`
- Build command: `npm ci && npm test && npm run cf:build`
- Deploy command: `npx wrangler deploy -c wrangler.cloudflare-git.jsonc`
- Temporary public URL variable: `NEXT_PUBLIC_SITE_URL=https://tap-rater-app-git.sam-alshalah1.workers.dev`

Important: Cloudflare Workers Builds is the source-of-truth deployment path for the `nextjs-commerce` branch. It deploys `tap-rater-app-git` and does not inherit secrets from `tap-rater-app`.

Current cutover notes:

- `tap-rater-app-git` now has the required Worker secret names configured.
- Public/static smoke routes, admin auth, and Neon-backed admin API reads passed after the Git-linked deployment.
- Active tap-event logging still needs a real active redirect device or a safe temporary test-data script before it can be marked fully verified.
- Resend is configured, but `taprater.com` is not verified in Resend yet, so email delivery is not production-ready until DNS verification is finished.
- Change `NEXT_PUBLIC_SITE_URL` back to `https://taprater.com` only when the custom domain is attached to the final Worker.

## Manual GitHub Actions Fallback

The repository still contains `.github/workflows/deploy-cloudflare-worker.yml`.

That workflow is manual-only and deploys `nextjs-commerce` to the rollback `tap-rater-app` Worker using GitHub Actions and Wrangler. Use it only if the Git-linked Worker fails and you intentionally need to restore the old Worker.

The default `wrangler.jsonc` stays pointed at `tap-rater-app` so the manual rollback workflow still targets the old Worker. The Git-linked Worker uses `wrangler.cloudflare-git.jsonc`.

## Local Verification

Run from the repo root:

```bash
npm ci
npm run build
npm test
npm run cf:build
```

Smoke test the manual rollback Worker:

```bash
SMOKE_BASE_URL=https://tap-rater-app.sam-alshalah1.workers.dev npm run smoke
```

Smoke test the Git-linked Worker:

```bash
SMOKE_BASE_URL=https://tap-rater-app-git.sam-alshalah1.workers.dev npm run smoke
```

## Manual Route Checks

Check these paths before any cutover:

- `/`
- `/shop`
- `/category/reviews`
- `/category/social-media`
- `/category/appointments`
- `/category/menu`
- `/category/feedback`
- `/category/custom-stands`
- `/product/google-review-stand`
- `/product/custom-direct-stand`
- `/activate`
- `/admin/login`
- `/r/TR-DEMO-GOOGLE`

## Cutover Rules

Do not attach the final custom domain to `tap-rater-app-git` until:

1. All required Worker secrets are added to `tap-rater-app-git`.
2. `NEXT_PUBLIC_SITE_URL` is set to the active public URL for the Worker being verified.
3. Admin login works.
4. Neon-backed product/device/activation flows work.
5. Resend notifications are tested or explicitly deferred.
6. Cloudflare logs show no runtime errors during smoke tests.
7. A push to `nextjs-commerce` automatically starts and completes a Cloudflare Workers Build.
8. The deployed commit SHA matches the latest pushed commit.

After custom-domain cutover, remove the older manual deploy path only after the Git-linked Worker is proven stable and rollback is no longer needed.

## Rollback

If the Git-linked Worker fails:

1. Keep using `tap-rater-app`.
2. Re-run the GitHub Actions workflow `Manual Deploy Old Cloudflare Worker` from GitHub Actions.
3. Confirm `https://tap-rater-app.sam-alshalah1.workers.dev/` passes smoke tests.
4. Do not delete any Worker, secret, domain, or route until a replacement has passed verification.
