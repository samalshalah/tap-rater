import { isValidHostedPageCode } from "@/lib/hosted-pages/codes";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { readCurrentHostedPageSnapshot } from "@/lib/hosted-pages/repository";
import { hostedPageResponseStatus, renderHostedPageHtml, resolveHostedPageLifecycle } from "@/lib/hosted-pages/snapshots";

type PublicHostedPageRouteProps = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: PublicHostedPageRouteProps) {
  const { code } = await params;

  if (!isValidHostedPageCode(code)) {
    return hostedPageResponse({ state: "not_found" });
  }

  const storage = await getHostedPageStorage();
  if (!storage) {
    return hostedPageResponse({ state: "not_found" });
  }

  const snapshot = await readCurrentHostedPageSnapshot(storage, code);
  return hostedPageResponse(snapshot ? resolveHostedPageLifecycle(snapshot) : { state: "not_found" });
}

function hostedPageResponse(resolution: Parameters<typeof renderHostedPageHtml>[0]) {
  return new Response(renderHostedPageHtml(resolution), {
    status: hostedPageResponseStatus(resolution),
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Robots-Tag": "noindex",
      "X-Tap-Rater-Hosted-Page-State": resolution.state
    }
  });
}

