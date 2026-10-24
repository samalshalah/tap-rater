import {neon} from '@neondatabase/serverless';
import {observeWorker} from './src/lib/worker-observation';
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
    const sql=neon(env.DATABASE_URL);
    const invoke=async(name:string,path:string)=>{
      try {
        await observeWorker(name,async()=>{
          const response=await openNextWorker.fetch(new Request(`https://taprater.com/api/internal/${path}`,{
            method:'POST',headers:{'x-internal-secret':env.ADMIN_SESSION_SECRET},
          }),env,context);
          if(!response.ok)throw new Error(`Worker HTTP ${response.status}`);
          return response.json();
        },sql);
      }catch { console.warn(`${name} worker unavailable`); }
    };
    await invoke('reviews','google-reviews');
    if(new Date(_controller.scheduledTime).getUTCMinutes()%15!==0)return;
    await invoke('analytics','analytics');
    await invoke('reminders','checkout-reminders');
    await invoke('sample-drafts','review-auto-drafts');
    await invoke('heatmap','heatmap-scans');
    try {
      await observeWorker('backup',async()=>{
        const state=await runMediaBackupBatch(env.PRODUCT_MEDIA_BUCKET,env.RECOVERY_BACKUPS);
        return {completed:Boolean(state.completedAt),objects:state.objects,bytes:state.bytes};
      },sql);
    }catch {console.warn('Media backup unavailable');}
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
