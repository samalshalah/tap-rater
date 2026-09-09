import { getCanonicalRedirectUrl } from "./src/lib/canonical-request";
import { getLegacyPublicAssetUrl } from "./src/lib/legacy-public-assets";
import { runMediaBackupBatch } from "./src/lib/media-recovery";

// @ts-expect-error The OpenNext Worker is generated after the application build.
import openNextWorker from "./.open-next/worker.js";

export default {
  async scheduled(_controller: ScheduledController, env: CloudflareEnv) {
    const state = await runMediaBackupBatch(env.PRODUCT_MEDIA_BUCKET, env.RECOVERY_BACKUPS);
    console.log(JSON.stringify({ event: "media_backup", completed: Boolean(state.completedAt), objects: state.objects, bytes: state.bytes }));
  },
  fetch(request: Request, env: CloudflareEnv, context: unknown) {
    const redirectUrl = getCanonicalRedirectUrl(request);
    if (redirectUrl) {
      return new Response(null, {
        status: 308,
        headers: { Location: redirectUrl.toString() }
      });
    }

    // OpenNext does not re-enter Cloudflare's static asset lookup after a Next rewrite.
    const assetUrl = getLegacyPublicAssetUrl(request);
    if (assetUrl && env.ASSETS) {
      return env.ASSETS.fetch(assetUrl.toString(), {
        method: request.method,
        headers: Object.fromEntries(request.headers)
      });
    }

    return openNextWorker.fetch(request, env, context);
  }
};

// @ts-expect-error These OpenNext exports are generated after the application build.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
