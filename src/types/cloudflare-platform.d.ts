// Scope platform bindings without replacing Next.js/DOM Request and Response types.
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type RateLimit = import("@cloudflare/workers-types").RateLimit;
type Fetcher = import("@cloudflare/workers-types").Fetcher;
type ScheduledController = import("@cloudflare/workers-types").ScheduledController;
