import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

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
      { source: "/multi-link", destination: "/category/website-link-stands", permanent: true },
      { source: "/product-category/:slug*", destination: "/shop", permanent: true },
      { source: "/my-account", destination: "/admin", permanent: true }
    ];
  }
};

export default nextConfig;

initOpenNextCloudflareForDev();
