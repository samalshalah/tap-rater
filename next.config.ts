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
      { source: "/product-category/:slug*", destination: "/shop", permanent: true },
      { source: "/my-account", destination: "/admin", permanent: true }
    ];
  }
};

export default nextConfig;

initOpenNextCloudflareForDev();
