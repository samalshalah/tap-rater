import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.link.com",
  "font-src 'self' data:",
  "form-action 'self' https://*.stripe.com",
  "frame-ancestors 'none'",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://*.link.com",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.js.stripe.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")' },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }
];

const privateRoutePatterns = [
  "/admin/:path*",
  "/account/:path*",
  "/api/:path*",
  "/cart",
  "/checkout/:path*",
  "/activate",
  "/p/:path*",
  "/l/:path*",
  "/r/:path*"
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "taprater.com",
        pathname: "/wp-content/uploads/**"
      }
    ]
  },
  async redirects() {
    return [
      { source: "/faq", destination: "/faqs", permanent: true },
      { source: "/contact", destination: "/contact-us", permanent: true },
      { source: "/shop-by-use", destination: "/solutions", permanent: true },
      { source: "/custom-branding", destination: "/custom-stands", permanent: true },
      { source: "/product-category/:slug*", destination: "/shop", permanent: true },
      { source: "/my-account", destination: "/admin", permanent: true }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      ...privateRoutePatterns.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
      })),
      {
        source: "/account/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }]
      }
    ];
  }
};

export default nextConfig;

initOpenNextCloudflareForDev();
