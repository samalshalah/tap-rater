const productionSiteUrl = "https://taprater.com";
const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function getPublicSiteUrl(env: Record<string, string | undefined> = process.env) {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return productionSiteUrl;

  try {
    const url = new URL(configured);
    if (env.NODE_ENV === "production" && localHostnames.has(url.hostname)) {
      return productionSiteUrl;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return productionSiteUrl;
  }
}
