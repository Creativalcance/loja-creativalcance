import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
