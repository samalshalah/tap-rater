import { isValidHostedPageCode } from "../../../src/lib/hosted-pages/codes";
import { readCurrentHostedPageSnapshot } from "../../../src/lib/hosted-pages/repository";
import { createR2HostedPageStorage } from "../../../src/lib/hosted-pages/r2-storage";
import {
  hostedPageResponseStatus,
  renderHostedPageHtml,
  resolveHostedPageLifecycle,
  type HostedPageResolution
} from "../../../src/lib/hosted-pages/snapshots";

const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  "X-Robots-Tag": "noindex"
};

export default {
  async fetch(request, env, ctx) {
    return handleHostedPageRequest(request, env, ctx, (caches as CacheStorage & { default: Cache }).default);
  }
} satisfies ExportedHandler<Env>;

export async function handleHostedPageRequest(request: Request, env: Env, ctx: ExecutionContext, cache?: Cache): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" }
    });
  }

  const code = readCodeFromRequest(request);
  if (!code || !isValidHostedPageCode(code)) {
    return htmlResponse({ state: "not_found" }, request.method);
  }

  const cacheKey = new Request(new URL(`/p/${code}`, request.url), { method: "GET" });

  try {
    const storage = createR2HostedPageStorage(env.HOSTED_PAGE_SNAPSHOTS);
    const snapshot = await readCurrentHostedPageSnapshot(storage, code);
    const resolution = snapshot ? resolveHostedPageLifecycle(snapshot) : { state: "not_found" as const };
    const response = htmlResponse(resolution, request.method);

    if (cache && request.method === "GET" && response.status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    const cached = cache ? await cache.match(cacheKey) : undefined;
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Tap-Rater-Hosted-Page-Source", "cache-last-known-good");
      return new Response(request.method === "HEAD" ? null : cached.body, {
        status: cached.status,
        headers
      });
    }

    console.error(
      JSON.stringify({
        event: "hosted_page_delivery_failed",
        code,
        message: error instanceof Error ? error.message : "Unknown hosted page delivery failure"
      })
    );

    return htmlResponse({ state: "not_found" }, request.method, {
      "X-Tap-Rater-Hosted-Page-Source": "error-no-cache"
    });
  }
}

function htmlResponse(resolution: HostedPageResolution, method: string, extraHeaders?: Record<string, string>) {
  const headers = new Headers(htmlHeaders);
  headers.set("X-Tap-Rater-Hosted-Page-State", resolution.state);

  for (const [key, value] of Object.entries(extraHeaders ?? {})) {
    headers.set(key, value);
  }

  return new Response(method === "HEAD" ? null : renderHostedPageHtml(resolution), {
    status: hostedPageResponseStatus(resolution),
    headers
  });
}

function readCodeFromRequest(request: Request) {
  const url = new URL(request.url);
  const [prefix, code, extra] = url.pathname.split("/").filter(Boolean);
  if (prefix !== "p" || extra) return undefined;
  return code;
}
