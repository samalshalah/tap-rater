import { getCanonicalRedirectUrl } from "./src/lib/canonical-request";

// @ts-expect-error The OpenNext Worker is generated after the application build.
import openNextWorker from "./.open-next/worker.js";

export default {
  fetch(request: Request, env: CloudflareEnv, context: unknown) {
    const redirectUrl = getCanonicalRedirectUrl(request);
    if (redirectUrl) {
      return new Response(null, {
        status: 308,
        headers: { Location: redirectUrl.toString() }
      });
    }

    return openNextWorker.fetch(request, env, context);
  }
};

// @ts-expect-error These OpenNext exports are generated after the application build.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
