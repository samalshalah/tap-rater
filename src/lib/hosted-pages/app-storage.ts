import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createLocalHostedPageStorage } from "@/lib/hosted-pages/local-storage";
import type { HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { createR2HostedPageStorage, type HostedPageR2Bucket } from "@/lib/hosted-pages/r2-storage";
import { createWranglerR2HostedPageStorage } from "@/lib/hosted-pages/wrangler-r2-storage";

export async function getHostedPageStorage(): Promise<HostedPageTextStorage | undefined> {
  if (process.env.NODE_ENV !== "production" && process.env.TAP_RATER_LOCAL_HOSTED_PAGES_DIR?.trim()) {
    return createLocalHostedPageStorage(process.env.TAP_RATER_LOCAL_HOSTED_PAGES_DIR);
  }

  if (process.env.NODE_ENV !== "production" && process.env.TAP_RATER_REMOTE_HOSTED_PAGES_BUCKET?.trim()) {
    return createWranglerR2HostedPageStorage(process.env.TAP_RATER_REMOTE_HOSTED_PAGES_BUCKET);
  }

  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as { HOSTED_PAGE_SNAPSHOTS?: HostedPageR2Bucket };
    return env.HOSTED_PAGE_SNAPSHOTS ? createR2HostedPageStorage(env.HOSTED_PAGE_SNAPSHOTS) : undefined;
  } catch {
    return undefined;
  }
}
