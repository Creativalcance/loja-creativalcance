import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.hideacontent.com",
        pathname: "/public/products/**",
      },
    ],
  },
};

export default nextConfig;
