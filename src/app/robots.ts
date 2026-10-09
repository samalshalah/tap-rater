import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = getPublicSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Public auth/transaction screens must be crawlable to expose their noindex headers.
      disallow: ["/admin", "/api", "/p/", "/l/", "/r/"]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
