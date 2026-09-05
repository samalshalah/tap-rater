# Tap Rater Deployment

Tap Rater has one active Cloudflare Worker target:

- Worker name: `tap-rater-app-git`
- Production domains: `https://taprater.com` and `https://www.taprater.com`
- Repo: `samalshalah/tap-rater`
- Branch: `nextjs-commerce`
- Database: Neon project `tap-rater`, production branch
- Primary Wrangler config: `wrangler.cloudflare-git.jsonc`
- Default local Wrangler config: `wrangler.jsonc`

Both Wrangler configs must stay pointed at `tap-rater-app-git`. Do not reintroduce old Worker names or duplicate deployment targets.

## Deployment Path

Cloudflare Workers Git integration is the source-of-truth deployment path for the `nextjs-commerce` branch. The expected build command is:

```bash
npm ci && npm test && npm run cf:build
```

The Worker deploy command, when explicitly approved, is:

```bash
npx wrangler deploy -c wrangler.cloudflare-git.jsonc
```

Do not manually deploy, change routing, or enable live Stripe without explicit owner approval.

## Manual Validation Workflow

The repository includes:

```text
.github/workflows/deploy-cloudflare-worker.yml
```

That workflow is manual-only and validates the active Worker bundle by running tests and `npm run cf:build`. It does not deploy.

## Runtime Variable Inventory

Required Worker variables and secrets:

| Variable | Type | Required for |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public variable | Absolute URLs, SEO metadata, checkout return URLs |
| `DATABASE_URL` | Secret | Neon persistence for products, requests, activations, orders |
| `ADMIN_EMAIL` | Secret | Admin login |
| `ADMIN_PASSWORD` | Secret | Admin login |
| `ADMIN_SESSION_SECRET` | Secret | Signed admin session cookie |
| `CUSTOMER_SESSION_SECRET` | Secret | Signed customer session and customer links |
| `RESEND_API_KEY` | Secret | Email sending through Resend |
| `RESEND_FROM_EMAIL` | Secret | Verified sender address |
| `RESEND_WEBHOOK_SECRET` | Secret | Signature verification for Resend delivery events |
| `ORDER_NOTIFICATION_EMAIL` | Secret | Order/request notification recipient |
| `STRIPE_MODE` | Variable | `test` or `live`; defaults to `test` if missing |
| `STRIPE_SECRET_KEY` | Secret | Stripe Checkout |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public variable | Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook verification |

Optional variables:

| Variable | Type | Used for |
| --- | --- | --- |
| `ADMIN_NOTIFICATION_EMAIL` | Secret | Backend email test recipient |
| `NEON_DATABASE_URL` | Secret | Alternative alias for `DATABASE_URL` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public variable | Google Places search in activation |
| `ADMIN_SESSION_TTL_HOURS` | Variable | Override admin session expiry |
| `CRON_SECRET` | Secret | Separate backend job service |

Secret values must not be committed, printed in logs, or pasted into issue comments.

## Local Verification

Run from the repo root:

```bash
npm ci
npx tsc --noEmit
npm test
npm run build
npm run cf:build
```

Smoke test production only when explicitly approved:

```bash
SMOKE_BASE_URL=https://taprater.com npm run smoke
```

## Cutover And Stripe Rules

- `NEXT_PUBLIC_SITE_URL` should be `https://taprater.com` for production.
- Keep Stripe in `test` mode until live sales are explicitly approved.
- Live Stripe requires `STRIPE_MODE=live`, an `sk_live_` secret key, a `pk_live_` publishable key, and the live webhook signing secret for `https://taprater.com/api/webhooks/stripe`.
- Never mix test keys with `STRIPE_MODE=live`, or live keys with `STRIPE_MODE=test`.

## Rollback

If production fails after a future deployment:

1. Do not delete any Worker, secret, database, route, or domain.
2. Identify the last known good `nextjs-commerce` commit.
3. Revert or redeploy only the approved last known good commit to `tap-rater-app-git`.
4. Verify `/`, `/shop`, `/cart`, `/admin/login`, checkout, webhook, and admin orders before resuming sales.
