import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = getPublicSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Public auth/transaction screens must be crawlable to expose their noindex headers.
        disallow: ["/admin", "/api", "/p/", "/l/", "/r/"]
      },
      {
        userAgent: "Google-Extended",
        // Google merges matching groups and prefers more specific paths. Cloudflare
        // prepends Disallow: /; these exceptions cover public storefront content.
        allow: [
          "/$", "/shop$", "/category/", "/product/", "/solutions$", "/solutions/",
          "/google-review-stand-for/", "/nfc-vs-qr-google-review-stand$",
          "/review-links-generator$", "/how-it-works$", "/pricing$", "/shipping$",
          "/stand-bundles$", "/multi-link$", "/faqs$"
        ],
        disallow: "/"
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
