import { getCanonicalRedirectUrl } from "./src/lib/canonical-request";
import { getLegacyPublicAssetUrl } from "./src/lib/legacy-public-assets";
import { runMediaBackupBatch } from "./src/lib/media-recovery";

// @ts-expect-error The OpenNext Worker is generated after the application build.
import openNextWorker from "./.open-next/worker.js";

export default {
  async scheduled(
    _controller: ScheduledController,
    env: CloudflareEnv,
    context: unknown,
  ) {
    try {
      console.log(JSON.stringify({ event: "google_review_maintenance_started" }));
      const reviews = await openNextWorker.fetch(new Request("https://taprater.com/api/internal/google-reviews", {
        method: "POST", headers: { "x-internal-secret": env.ADMIN_SESSION_SECRET },
      }), env, context);
      const result = reviews.ok ? await reviews.json() as {synced?:number;drafted?:number;published?:number} : null;
      console.log(JSON.stringify({ event: "google_review_maintenance", ok: reviews.ok, status: reviews.status,
        synced: result?.synced, drafted: result?.drafted, published: result?.published }));
    } catch { console.warn("Google review maintenance unavailable"); }
    if (new Date(_controller.scheduledTime).getUTCMinutes() % 15 !== 0) return;
    try {
      const analytics = await openNextWorker.fetch(
        new Request("https://taprater.com/api/internal/analytics", {
          method: "POST",
          headers: { "x-internal-secret": env.ADMIN_SESSION_SECRET },
        }),
        env,
        context,
      );
      console.log(
        JSON.stringify({ event: "analytics_purchase_retry", ok: analytics.ok }),
      );
    } catch {
      console.warn("Analytics retry unavailable");
    }
    try {
      const reminders = await openNextWorker.fetch(new Request("https://taprater.com/api/internal/checkout-reminders", {
        method: "POST", headers: { "x-internal-secret": env.ADMIN_SESSION_SECRET },
      }), env, context);
      console.log(JSON.stringify({ event: "checkout_reminders", ok: reminders.ok }));
    } catch { console.warn("Checkout reminders unavailable"); }
    try {
      const drafts = await openNextWorker.fetch(new Request("https://taprater.com/api/internal/review-auto-drafts", {
        method: "POST", headers: { "x-internal-secret": env.ADMIN_SESSION_SECRET },
      }), env, context);
      console.log(JSON.stringify({ event: "review_sample_auto_drafts", ok: drafts.ok }));
    } catch { console.warn("Sample auto drafts unavailable"); }
    try {
      const ranks = await openNextWorker.fetch(new Request("https://taprater.com/api/internal/heatmap-scans", {
        method: "POST", headers: { "x-internal-secret": env.ADMIN_SESSION_SECRET },
      }), env, context);
      console.log(JSON.stringify({ event: "heatmap_scans", ok: ranks.ok }));
    } catch { console.warn("Heat map scans unavailable"); }
    const state = await runMediaBackupBatch(
      env.PRODUCT_MEDIA_BUCKET,
      env.RECOVERY_BACKUPS,
    );
    console.log(
      JSON.stringify({
        event: "media_backup",
        completed: Boolean(state.completedAt),
        objects: state.objects,
        bytes: state.bytes,
      }),
    );
  },
  fetch(request: Request, env: CloudflareEnv, context: unknown) {
    const redirectUrl = getCanonicalRedirectUrl(request);
    if (redirectUrl) {
      return new Response(null, {
        status: 308,
        headers: { Location: redirectUrl.toString() },
      });
    }

    // OpenNext does not re-enter Cloudflare's static asset lookup after a Next rewrite.
    const assetUrl = getLegacyPublicAssetUrl(request);
    if (assetUrl && env.ASSETS) {
      return env.ASSETS.fetch(assetUrl.toString(), {
        method: request.method,
        headers: Object.fromEntries(request.headers),
      });
    }

    return openNextWorker.fetch(request, env, context);
  },
};

// @ts-expect-error These OpenNext exports are generated after the application build.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
