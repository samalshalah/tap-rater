# AI cost tracking

Enabled for new manual and automatic review suggestions, sample review suggestions, and profile-fix drafts. Client pricing and publishing are unchanged.

Apply `docs/sql/ai-usage-ledger.sql` before deploying the application. The migration is additive and idempotent. It was tested on the isolated `ai-cost-ledger-validation-20261022` branch, including measured and missing-usage rows across two accounts and three locations.

Each provider invocation first inserts a durable event attributed to the authenticated workflow's expected customer and location. A changed owner or unavailable ledger prevents inference. The event contains IDs, service, model, saved rates, status, timestamps, token counts and gross cost only. It never contains prompts, generated text, reviews, profile fields, contact details, or provider error messages. RLS is enabled with no public policies and PUBLIC privileges are revoked.

Costs use the provider's returned `usage.prompt_tokens` and `usage.completion_tokens`. The model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` has rates verified on 2026-10-22: $0.293 per million input tokens and $2.253 per million output tokens. Integer nano-USD arithmetic preserves sub-cent precision. Each event snapshots its rate version, so later rate changes do not rewrite old costs.

Sources:
- https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- https://developers.cloudflare.com/workers-ai/platform/pricing/

These are measured-usage **gross model costs**, not the allocated invoice amount. Cloudflare applies a shared daily free allowance, credits, and taxes at the account level. No arbitrary client allocation is inferred. Recheck rates when changing models or when provider pricing changes; unknown models fail closed.

`started`, `usage_missing`, and `provider_error` events have unknown cost, never a fabricated zero. Recording completion is idempotent and may retry once; inference is not retried by the meter. Interrupted calls retain a started row. Usage is recorded before output parsing so invalid generated JSON can still have a measured cost. Genuine provider-reported zero tokens remain zero.

The admin Usage page shows current New York calendar-month aggregates per account and opaque location identifier. It displays counts of unmeasured calls and does not expose client content. Calls predating deployment cannot be reconstructed from daily counters. The ledger retains history independently of those counters; no historical costs are backfilled.

Validation: unit tests cover exact cost arithmetic, invalid/missing usage, provider errors, storage failures before inference, idempotent completion retry, privacy allowlists, location/account separation, and existing draft-only flows. No test fixtures are inserted into the production ledger.
