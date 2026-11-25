import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isValidHostedPageCode } from "@/lib/hosted-pages/codes";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { readCurrentHostedPageSnapshot } from "@/lib/hosted-pages/repository";
import { hostedPageForwardStepUrl, readHostedPageTracking } from "@/lib/hosted-pages/tracking";
import { hostedPageForwardUrl, hostedPageResponseStatus, renderHostedPageHtml, resolveHostedPageLifecycle } from "@/lib/hosted-pages/snapshots";

type PublicHostedPageRouteProps = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, { params }: PublicHostedPageRouteProps) {
  const { code } = await params;

  if (!(await isProductionHostedPageRouteEnabled())) {
    return hostedPageResponse({ state: "not_found" }, "inactive");
  }

  if (!isValidHostedPageCode(code)) {
    return hostedPageResponse({ state: "not_found" });
  }

  const storage = await getHostedPageStorage();
  if (!storage) {
    return hostedPageResponse({ state: "not_found" });
  }

  const snapshot = await readCurrentHostedPageSnapshot(storage, code);
  const resolution = snapshot ? resolveHostedPageLifecycle(snapshot) : { state: "not_found" as const };
  const forward = hostedPageForwardUrl(resolution);
  if (forward) {
    return new Response(null, { status: 302, headers: { Location: hostedPageForwardStepUrl(code, readHostedPageTracking(new URL(request.url))), "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Tap-Rater-Hosted-Page-State": "forwarded" } });
  }
  return hostedPageResponse(resolution);
}

async function isProductionHostedPageRouteEnabled() {
  if (process.env.TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES === "true") return true;

  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as { TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES?: string };
    return env.TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES === "true";
  } catch {
    return false;
  }
}

function hostedPageResponse(resolution: Parameters<typeof renderHostedPageHtml>[0], routeState = resolution.state) {
  return new Response(renderHostedPageHtml(resolution), {
    status: hostedPageResponseStatus(resolution),
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Robots-Tag": "noindex",
      "X-Tap-Rater-Hosted-Page-State": routeState
    }
  });
}
