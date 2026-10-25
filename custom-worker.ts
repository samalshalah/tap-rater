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
    // Alert delivery runs independently of scans and publishing.
    try {await observeWorker('client-alerts',async()=>{const response=await openNextWorker.fetch(new Request('https://taprater.com/api/internal/client-failures',{
      method:'POST',headers:{'x-internal-secret':env.ADMIN_SESSION_SECRET,'Content-Type':'application/json'},body:JSON.stringify({action:'drain'}),
    }),env,context);if(!response.ok)throw new Error('Client failure monitor unavailable');return response.json();},sql);}catch{console.warn('Client failure alerts unavailable');}
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

  async fetch(request: Request, env: CloudflareEnv, context: unknown) {
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

    const url=new URL(request.url);
    const observed=(/^(?:\/account|\/api\/(?:account|activate|checkout|forms|landing-pages|media|setup|site))(?:\/|$)/.test(url.pathname))&&url.pathname!=='/api/account/client-failures';
    const report=(status:number)=>{
      if(!observed||status<400)return;
      let businessId:string|null=null;
      try {const ref=new URL(request.headers.get('referer')||request.url);if(ref.origin===url.origin)businessId=ref.searchParams.get('location');}catch{}
      const work=openNextWorker.fetch(new Request('https://taprater.com/api/internal/client-failures',{
        method:'POST',headers:{'x-internal-secret':env.ADMIN_SESSION_SECRET,'Content-Type':'application/json',cookie:request.headers.get('cookie')||''},
        body:JSON.stringify({path:url.pathname,status,businessId}),
      }),env,context).then((response:Response)=>{if(!response.ok)console.warn('Client failure recording unavailable');}).catch(()=>console.warn('Client failure recording unavailable'));
      (context as {waitUntil(promise:Promise<unknown>):void}).waitUntil(work);
    };
    try{const response=await openNextWorker.fetch(request,env,context);report(response.status);return response;}
    catch(error){report(500);throw error;}
  },
};

// @ts-expect-error These OpenNext exports are generated after the application build.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
