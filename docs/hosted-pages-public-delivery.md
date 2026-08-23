# Permanent Hosted Page Public Delivery

Milestone 5 makes `https://taprater.com/p/{code}` the immutable public URL for HOSTED physical products.

## Route Ownership

Production public delivery is owned by the lightweight Worker in `workers/hosted-pages`, not the OpenNext storefront/editor Worker. Its route is `taprater.com/p/*`, which is more specific than a broad app route and therefore can isolate already-published pages from editor, storefront, or app database failures.

The Next route at `src/app/p/[code]/route.ts` is a compatibility reader for local development and app previews. The production route should remain assigned to the dedicated Worker.

## Snapshot Storage

Published page delivery reads from the `HOSTED_PAGE_SNAPSHOTS` R2 binding. It does not perform normal Postgres, Supabase, Neon, editor, checkout, or subscription API lookups.

R2 keys:

- `hosted-pages/{code}/assignment.json` stores immutable physical product assignment metadata.
- `hosted-pages/by-product/{physicalProductRef}.json` preserves idempotent lookup for the same physical product.
- `hosted-pages/{code}/versions/{version}.json` stores immutable published snapshots.
- `hosted-pages/{code}/current.json` points to the current published version.

Publishing writes the immutable version object first and updates `current.json` second. If a publish fails before pointer promotion, the previous current pointer remains the last-known-good page. Rollback changes only `current.json` to a prior existing version. Version objects and assignments are never deleted as part of normal operations.

## Permanent Code Rules

Codes are 12-character opaque, URL-safe, non-sequential Tap Rater codes. They are assigned to a physical product once and are never changed, recycled, or reassigned. Collision handling burns rather than reuses a code if an assignment write succeeds but a later product-index write cannot be confirmed.

DIRECT products are not part of this infrastructure. They continue to encode both QR and NFC directly to the customer-provided URL and do not require a Tap Rater account, activation, hosted redirect, or subscription.

## Lifecycle Behavior

- `ACTIVE`: public page renders normally.
- `PAST_DUE`: page renders normally for a seven-day grace period from `subscriptionPastDueSince`; after that it renders an inactive branded page.
- `CANCELLED_AT_PERIOD_END`: page renders normally until `subscriptionPaidThrough`; after that it renders an inactive branded page.
- `EXPIRED`: permanent URL remains reserved and renders an inactive branded page.
- `REACTIVATED`: same permanent code renders normally again.
- `RETIRED_INTERNAL`: permanent URL remains reserved and renders an inactive branded page.
- Unknown code: renders a clean Tap Rater not-found page.

Permanent URLs are never recycled in any lifecycle state.

## Cache And Failure Behavior

The Worker returns `Cache-Control: public, max-age=60, stale-while-revalidate=300` and writes successful `200` page responses to the Cloudflare Cache API. If R2 delivery fails and a cached response exists, the Worker serves that cached last-known-good response with `X-Tap-Rater-Hosted-Page-Source: cache-last-known-good`.

Cache TTL is intentionally short so normal snapshot updates appear quickly without requiring editor-driven cache invalidation. A future publish tool may purge `/p/{code}` after pointer promotion, but public correctness does not depend on the editor being online.

## Deployment And Rollback

Deploy or validate the production Worker without attaching the live `/p/*` route with:

```bash
npx wrangler deploy --config workers/hosted-pages/wrangler.jsonc
```

Validate without deploying:

```bash
npx wrangler deploy --dry-run --config workers/hosted-pages/wrangler.jsonc
```

Final route activation is deliberately separated and must only happen during the approved production activation phase:

```bash
npx wrangler deploy --config workers/hosted-pages/wrangler.activation.jsonc
```

Worker rollback uses Cloudflare Worker version rollback. Page-content rollback uses `rollbackHostedPageSnapshot`, which only moves the current pointer back to an existing immutable snapshot version.
